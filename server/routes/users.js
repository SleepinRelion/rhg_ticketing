import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { sanitize } from '../utils/sanitize.js';
import { createAuditEntry } from '../middleware/auditLog.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// GET /api/users
router.get('/', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { role, is_active, search } = req.query;
    let query = db('users')
      .select('id', 'username', 'email', 'full_name', 'role', 'is_active', 'mfa_enabled', 'last_login_at', 'created_at', 'locked_until')
      .whereNull('deleted_at');

    if (role) query = query.where({ role });
    if (is_active !== undefined) query = query.where({ is_active: is_active === 'true' });
    if (search) {
      const s = `%${search}%`;
      query = query.where(function () {
        this.where('full_name', 'like', s).orWhere('email', 'like', s).orWhere('username', 'like', s);
      });
    }

    const users = await query.orderBy('full_name', 'asc');
    res.json({ users });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// GET /api/users/technicians — List active technicians
router.get('/technicians', authenticate, async (req, res) => {
  try {
    const technicians = await db('users')
      .select('id', 'full_name', 'username', 'email')
      .whereIn('role', ['technician', 'manager', 'admin'])
      .where({ is_active: true })
      .whereNull('deleted_at')
      .orderBy('full_name');
    res.json({ technicians });
  } catch (error) {
    console.error('List technicians error:', error);
    res.status(500).json({ error: 'Failed to fetch technicians.' });
  }
});

// GET /api/users/:id
router.get('/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const user = await db('users')
      .select('id', 'username', 'email', 'full_name', 'role', 'is_active', 'mfa_enabled', 'last_login_at', 'created_at', 'updated_at')
      .where({ id: req.params.id })
      .whereNull('deleted_at')
      .first();

    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

// POST /api/users — Create user (Admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { username, email, password, full_name, role } = req.body;

    if (!username || !email || !password || !full_name || !role) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (!['admin', 'manager', 'technician', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const cleanEmail = email.trim();
    const cleanUsername = sanitize(username);
    const existing = await db('users')
      .whereRaw('LOWER(email) = LOWER(?)', [cleanEmail])
      .orWhereRaw('LOWER(username) = LOWER(?)', [cleanUsername])
      .first();
      
    if (existing) {
      return res.status(409).json({ error: 'A user with this email or username already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [user] = await db('users').insert({
      username: sanitize(username),
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      full_name: sanitize(full_name),
      role,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    }).returning(['id', 'username', 'email', 'full_name', 'role']);

    await createAuditEntry(req.user.id, 'user_created', 'user', user.id, req.ip, req.headers['user-agent'], { username: user.username, role: user.role });
    res.status(201).json({ user });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// PUT /api/users/profile — Update own profile
router.put('/profile', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    const { full_name } = req.body;
    const updates = { updated_at: new Date() };

    if (full_name) updates.full_name = sanitize(full_name);
    
    if (req.file) {
      const normalizedPath = req.file.path.replace(/\\/g, '/');
      const parts = normalizedPath.split('/');
      const filename = parts.pop();
      const dateFolder = parts.pop();
      updates.avatar_url = `/uploads/${dateFolder}/${filename}`;
    }

    await db('users').where({ id: req.user.id }).update(updates);
    
    const user = await db('users')
      .select('id', 'username', 'email', 'full_name', 'role', 'avatar_url', 'is_active')
      .where({ id: req.user.id }).first();
      
    res.json({ user, message: 'Profile updated successfully.' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// PUT /api/users/:id
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { full_name, role, is_active, email } = req.body;
    const updates = { updated_at: new Date() };

    if (full_name) updates.full_name = sanitize(full_name);
    if (role && ['admin', 'manager', 'technician', 'staff'].includes(role)) updates.role = role;
    if (is_active !== undefined) updates.is_active = is_active;
    if (email) {
      const cleanEmail = email.trim();
      const existing = await db('users')
        .whereRaw('LOWER(email) = LOWER(?)', [cleanEmail])
        .whereNot('id', req.params.id)
        .first();
        
      if (existing) {
        return res.status(409).json({ error: 'A user with this email already exists.' });
      }
      updates.email = cleanEmail.toLowerCase();
    }

    await db('users').where({ id: req.params.id }).update(updates);
    await createAuditEntry(req.user.id, 'user_updated', 'user', parseInt(req.params.id), req.ip, req.headers['user-agent'], { fields: Object.keys(updates) });

    const user = await db('users')
      .select('id', 'username', 'email', 'full_name', 'role', 'is_active')
      .where({ id: req.params.id }).first();
    res.json({ user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

// PUT /api/users/:id/reset-password (Admin or Manager)
router.put('/:id/reset-password', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const passwordHash = await bcrypt.hash(new_password, 12);
    await db('users').where({ id: req.params.id }).update({
      password_hash: passwordHash,
      failed_login_attempts: 0,
      locked_until: null,
      updated_at: new Date(),
    });

    await createAuditEntry(req.user.id, 'password_reset', 'user', parseInt(req.params.id), req.ip, req.headers['user-agent'], {});
    res.json({ message: 'Password has been reset.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// POST /api/users/:id/reset-mfa (Admin only)
router.post('/:id/reset-mfa', authenticate, authorize('admin'), async (req, res) => {
  try {
    await db('users').where({ id: req.params.id }).update({
      mfa_enabled: false,
      mfa_secret: null,
      mfa_backup_codes: null,
      mfa_verified_at: null,
      updated_at: new Date(),
    });

    await createAuditEntry(req.user.id, 'mfa_reset', 'user', parseInt(req.params.id), req.ip, req.headers['user-agent'], {});
    res.json({ message: 'User MFA has been reset.' });
  } catch (error) {
    console.error('Reset MFA error:', error);
    res.status(500).json({ error: 'Failed to reset MFA.' });
  }
});

// POST /api/users/:id/unlock (Admin only)
router.post('/:id/unlock', authenticate, authorize('admin'), async (req, res) => {
  try {
    const user = await db('users').where({ id: req.params.id }).first();
    if (!user) return res.status(404).json({ error: 'User not found.' });

    await db('users').where({ id: req.params.id }).update({
      locked_until: null,
      failed_login_attempts: 0,
      updated_at: new Date(),
    });

    await createAuditEntry(req.user.id, 'account_unlocked', 'user', parseInt(req.params.id), req.ip, req.headers['user-agent'], {});
    res.json({ message: 'User account has been unlocked.' });
  } catch (error) {
    console.error('Unlock account error:', error);
    res.status(500).json({ error: 'Failed to unlock account.' });
  }
});

// DELETE /api/users/:id — Soft delete (Admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    await db('users').where({ id: req.params.id }).update({
      deleted_at: new Date(),
      is_active: false,
      updated_at: new Date(),
    });

    await createAuditEntry(req.user.id, 'user_deleted', 'user', parseInt(req.params.id), req.ip, req.headers['user-agent'], {});
    res.json({ message: 'User has been deactivated.' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

export default router;
