import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import db from '../config/database.js';
import authConfig from '../config/auth.js';
import { authenticate } from '../middleware/auth.js';
import { createAuditEntry } from '../middleware/auditLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import logger from '../config/logger.js';
import { sendPasswordResetEmail } from '../services/emailService.js';
import { authenticateLDAP } from '../services/ldapService.js';

const router = Router();

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password, mfaCode, _email_confirm } = req.body;

  if (_email_confirm) {
    return res.status(400).json({ error: 'Invalid request.' });
  }

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const loginStr = email.trim();
  let user = await db('users')
    .where(function() {
      this.whereRaw('LOWER(email) = LOWER(?)', [loginStr])
          .orWhereRaw('LOWER(username) = LOWER(?)', [loginStr]);
    })
    .whereNull('deleted_at')
    .first();

  let ldapAuthSuccess = false;
  let ldapUserAttrs = null;

  // Try LDAP if user is not found or user is explicitly LDAP
  if ((!user || user.auth_provider === 'ldap') && process.env.LDAP_URL) {
    try {
      ldapUserAttrs = await authenticateLDAP(loginStr, password);
      if (ldapUserAttrs) {
        ldapAuthSuccess = true;
      }
    } catch (e) {
      logger.warn('LDAP authentication error', { error: e.message });
    }
  }

  if (!user && !ldapAuthSuccess) {
    await createAuditEntry(null, 'login_failed', 'user', null, req.ip, req.headers['user-agent'], { email, reason: 'user_not_found' });
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  // Auto-provision LDAP user if they don't exist in local DB
  if (!user && ldapAuthSuccess) {
    const defaultRole = process.env.LDAP_DEFAULT_ROLE || 'technician';
    const [newUserId] = await db('users').insert({
      username: ldapUserAttrs.username,
      email: ldapUserAttrs.email,
      full_name: ldapUserAttrs.fullName,
      password_hash: '', // Handled by AD
      role: defaultRole,
      auth_provider: 'ldap',
      created_at: new Date(),
      updated_at: new Date()
    }).returning('id');
    
    user = await db('users').where({ id: newUserId.id || newUserId }).first();
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    await createAuditEntry(user.id, 'login_failed', 'user', user.id, req.ip, req.headers['user-agent'], { reason: 'account_locked' });
    return res.status(423).json({ error: 'Account is locked due to too many failed attempts. Please try again later.' });
  }

  if (!user.is_active) {
    return res.status(403).json({ error: 'Your account has been deactivated. Contact an administrator.' });
  }

  // Verify password locally if not LDAP authenticated
  if (!ldapAuthSuccess) {
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      const attempts = user.failed_login_attempts + 1;
      const updates = { failed_login_attempts: attempts };

      if (attempts >= authConfig.accountLockoutAttempts) {
        const lockUntil = new Date(Date.now() + authConfig.accountLockoutDurationMinutes * 60 * 1000);
        updates.locked_until = lockUntil;
        updates.failed_login_attempts = 0;
      }

      await db('users').where({ id: user.id }).update(updates);
      await createAuditEntry(user.id, 'login_failed', 'user', user.id, req.ip, req.headers['user-agent'], { reason: 'invalid_password', attempts });

      return res.status(401).json({ error: 'Invalid email or password.' });
    }
  }

  if (user.mfa_enabled) {
    const cleanMfaCode = mfaCode ? mfaCode.toString().replace(/\s+/g, '') : null;
    if (!cleanMfaCode) {
      return res.status(200).json({ mfaRequired: true, message: 'Please enter the code from your Authenticator App.' });
    }

    let isValidMfa = false;
    let usedBackupCodeIndex = -1;

    if (user.mfa_secret) {
      isValidMfa = authenticator.verify({ token: cleanMfaCode, secret: user.mfa_secret });
    }

    if (!isValidMfa && user.mfa_backup_codes) {
      try {
        const backupCodes = JSON.parse(user.mfa_backup_codes);
        for (let i = 0; i < backupCodes.length; i++) {
          if (bcrypt.compareSync(cleanMfaCode, backupCodes[i])) {
            isValidMfa = true;
            usedBackupCodeIndex = i;
            break;
          }
        }
      } catch (e) {
        logger.warn('Failed to parse user backup codes during login', { userId: user.id });
      }
    }

    if (!isValidMfa) {
      await createAuditEntry(user.id, 'login_failed', 'user', user.id, req.ip, req.headers['user-agent'], { reason: 'invalid_mfa' });
      return res.status(401).json({ error: 'Invalid verification code.' });
    }

    if (usedBackupCodeIndex !== -1) {
      const backupCodes = JSON.parse(user.mfa_backup_codes);
      backupCodes.splice(usedBackupCodeIndex, 1);
      await db('users').where({ id: user.id }).update({ mfa_backup_codes: JSON.stringify(backupCodes) });
    }
  }

  if (user.force_password_change) {
    const tempToken = jwt.sign(
      { userId: user.id, type: 'force_password_change' },
      authConfig.jwtSecret,
      { expiresIn: '15m' }
    );
    return res.json({ requirePasswordChange: true, tempToken });
  }

  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    authConfig.jwtSecret,
    { expiresIn: authConfig.jwtExpiresIn }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    authConfig.jwtRefreshSecret,
    { expiresIn: authConfig.jwtRefreshExpiresIn }
  );

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await db('refresh_tokens').insert({
    user_id: user.id,
    token: tokenHash,
    expires_at: expiresAt,
    created_at: new Date(),
  });

  await db('users').where({ id: user.id }).update({
    failed_login_attempts: 0,
    locked_until: null,
    last_login_at: new Date(),
  });

  await createAuditEntry(user.id, 'login_success', 'user', user.id, req.ip, req.headers['user-agent'], {});

  res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      mfaEnabled: user.mfa_enabled,
      avatar_url: user.avatar_url,
    },
  });
}));

router.post('/force-change-password', asyncHandler(async (req, res) => {
  const { tempToken, newPassword } = req.body;
  if (!tempToken || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required.' });
  }
  
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  try {
    const decoded = jwt.verify(tempToken, authConfig.jwtSecret);
    if (decoded.type !== 'force_password_change') {
      return res.status(401).json({ error: 'Invalid token type.' });
    }

    const user = await db('users').where({ id: decoded.userId }).first();
    if (!user || !user.force_password_change) {
      return res.status(400).json({ error: 'Password change not required or user invalid.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db('users').where({ id: user.id }).update({
      password_hash: passwordHash,
      force_password_change: false,
      updated_at: new Date()
    });

    res.json({ message: 'Password updated successfully. Please login with your new password.' });
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid. Please login again.' });
  }
}));

router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, authConfig.jwtRefreshSecret);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const storedToken = await db('refresh_tokens')
    .where({ token: tokenHash, is_revoked: false })
    .where('expires_at', '>', new Date())
    .first();

  if (!storedToken) {
    return res.status(401).json({ error: 'Refresh token has been revoked or expired.' });
  }

  const user = await db('users').where({ id: decoded.userId }).whereNull('deleted_at').first();
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'User account is no longer valid.' });
  }

  const newAccessToken = jwt.sign(
    { userId: user.id, role: user.role },
    authConfig.jwtSecret,
    { expiresIn: authConfig.jwtExpiresIn }
  );

  await db('refresh_tokens').where({ id: storedToken.id }).update({ is_revoked: true });

  const newRefreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    authConfig.jwtRefreshSecret,
    { expiresIn: authConfig.jwtRefreshExpiresIn }
  );

  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
  await db('refresh_tokens').insert({
    user_id: user.id,
    token: newTokenHash,
    expires_at: newExpiresAt,
    created_at: new Date(),
  });

  res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
}));

router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await db('refresh_tokens').where({ token: tokenHash }).update({ is_revoked: true });
  }
  
  await db('refresh_tokens').where({ user_id: req.user.id, is_revoked: false }).update({ is_revoked: true });
  await createAuditEntry(req.user.id, 'logout', 'user', req.user.id, req.ip, req.headers['user-agent'], {});
  
  res.json({ message: 'Logged out successfully.' });
}));

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

router.put('/change-password', authenticate, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }

  if (newPassword.length < 12) {
    return res.status(400).json({ error: 'New password must be at least 12 characters.' });
  }

  const user = await db('users').where({ id: req.user.id }).first();
  const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await db('users').where({ id: req.user.id }).update({
    password_hash: hash,
    updated_at: new Date(),
  });

  await createAuditEntry(req.user.id, 'password_changed', 'user', req.user.id, req.ip, req.headers['user-agent'], {});
  res.json({ message: 'Password changed successfully.' });
}));

router.post('/mfa/setup', authenticate, asyncHandler(async (req, res) => {
  const user = await db('users').where({ id: req.user.id }).first();
  if (user.mfa_enabled) {
    return res.status(400).json({ error: 'MFA is already enabled.' });
  }

  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(user.email, 'Ticketing RHG Mauritius', secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

  await db('users').where({ id: req.user.id }).update({ mfa_secret: secret });

  res.json({
    qrCode: qrCodeDataUrl,
    message: 'Scan the QR code with your authenticator app, then verify with a code.',
  });
}));

router.post('/mfa/verify', authenticate, asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Verification code is required.' });
  }

  const user = await db('users').where({ id: req.user.id }).first();
  if (!user.mfa_secret) {
    return res.status(400).json({ error: 'MFA setup has not been initiated.' });
  }

  const isValid = authenticator.verify({ token: code, secret: user.mfa_secret });
  if (!isValid) {
    return res.status(400).json({ error: 'Invalid verification code. Please try again.' });
  }

  const backupCodes = [];
  const hashedBackupCodes = [];
  for (let i = 0; i < 10; i++) {
    const backupCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    backupCodes.push(backupCode);
    hashedBackupCodes.push(bcrypt.hashSync(backupCode, 10));
  }

  await db('users').where({ id: req.user.id }).update({
    mfa_enabled: true,
    mfa_verified_at: new Date(),
    mfa_backup_codes: JSON.stringify(hashedBackupCodes),
    updated_at: new Date(),
  });

  await createAuditEntry(req.user.id, 'mfa_enabled', 'user', req.user.id, req.ip, req.headers['user-agent'], {});

  res.json({
    message: 'MFA has been enabled successfully.',
    backupCodes,
    warning: 'Save these backup codes securely. They can only be shown once.',
  });
}));

router.post('/mfa/disable', authenticate, (req, res) => {
  return res.status(403).json({ error: 'Two-Factor Authentication is compulsory for all staff and cannot be disabled. If you lost your device, contact an administrator to reset it.' });
});

router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const user = await db('users')
    .whereRaw('LOWER(email) = LOWER(?)', [email.trim()])
    .whereNull('deleted_at')
    .first();

  if (!user || !user.is_active) {
    // Return success even if user not found to prevent email enumeration
    return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db('users').where({ id: user.id }).update({
    reset_password_token: tokenHash,
    reset_password_expires: expiresAt,
  });

  try {
    await sendPasswordResetEmail(user.email, resetToken);
    await createAuditEntry(user.id, 'password_reset_requested', 'user', user.id, req.ip, req.headers['user-agent'], {});
  } catch (error) {
    logger.error('Failed to send password reset email', { error, userId: user.id });
  }

  res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
}));

router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required.' });
  }

  if (newPassword.length < 12) {
    return res.status(400).json({ error: 'New password must be at least 12 characters.' });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  const user = await db('users')
    .where({ reset_password_token: tokenHash })
    .where('reset_password_expires', '>', new Date())
    .whereNull('deleted_at')
    .first();

  if (!user || !user.is_active) {
    return res.status(400).json({ error: 'Invalid or expired password reset token.' });
  }

  const hash = await bcrypt.hash(newPassword, 12);
  
  await db('users').where({ id: user.id }).update({
    password_hash: hash,
    reset_password_token: null,
    reset_password_expires: null,
    updated_at: new Date(),
    failed_login_attempts: 0,
    locked_until: null
  });

  // Invalidate all active sessions (refresh tokens) when password is reset
  await db('refresh_tokens').where({ user_id: user.id, is_revoked: false }).update({ is_revoked: true });

  await createAuditEntry(user.id, 'password_reset_completed', 'user', user.id, req.ip, req.headers['user-agent'], {});
  
  res.json({ message: 'Password has been successfully reset. You can now log in.' });
}));

export default router;
