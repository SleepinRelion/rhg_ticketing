import { asyncHandler } from "../utils/asyncHandler.js";
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { sanitize } from '../utils/sanitize.js';
import { createAuditEntry } from '../middleware/auditLog.js';
import { upload } from '../middleware/upload.js';
import { checkPasswordComplexity, updatePasswordHistory } from '../utils/passwordSecurity.js';
const router = Router();

// GET /api/users
router.get('/', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const {
    role,
    is_active,
    search
  } = req.query;
  let query = db('users').select('id', 'username', 'email', 'full_name', 'role', 'is_active', 'mfa_enabled', 'last_login_at', 'created_at', 'locked_until').whereNull('deleted_at');
  if (role) query = query.where({
    role
  });
  if (is_active !== undefined) query = query.where({
    is_active: is_active === 'true'
  });
  if (search) {
    const s = `%${search}%`;
    query = query.where(function () {
      this.where('full_name', 'like', s).orWhere('email', 'like', s).orWhere('username', 'like', s);
    });
  }
  const users = await query.orderBy('full_name', 'asc');
  res.json({
    users
  });
}));

// GET /api/users/technicians — List active technicians
router.get('/technicians', authenticate, asyncHandler(async (req, res) => {
  const technicians = await db('users').select('id', 'full_name', 'username', 'email', 'avatar_url').whereIn('role', ['technician', 'manager', 'admin']).where({
    is_active: true
  }).whereNull('deleted_at').orderBy('full_name');
  res.json({
    technicians
  });
}));

// GET /api/users/:id
router.get('/:id', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const user = await db('users').select('id', 'username', 'email', 'full_name', 'role', 'is_active', 'mfa_enabled', 'last_login_at', 'created_at', 'updated_at').where({
    id: req.params.id
  }).whereNull('deleted_at').first();
  if (!user) return res.status(404).json({
    error: 'User not found.'
  });
  res.json({
    user
  });
}));

// POST /api/users — Create user (Admin only)
router.post('/', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const {
    username,
    email,
    password,
    full_name,
    role,
    hotel_ids,
    force_password_change
  } = req.body;

  // Validate required fields
  if (!username || !email || !password || !full_name || !role) {
    return res.status(400).json({
      error: 'All fields are required.'
    });
  }

  // Check password complexity using environment rules
  const complexityError = checkPasswordComplexity(password);
  if (complexityError) {
    return res.status(400).json({ error: complexityError });
  }

  // Check existing email
  const cleanEmail = email.toLowerCase().trim();
  const existing = await db('users').whereRaw('LOWER(email) = LOWER(?)', [cleanEmail]).orWhereRaw('LOWER(username) = LOWER(?)', [username.trim()]).first();
  if (existing) {
    return res.status(409).json({
      error: 'A user with this email or username already exists.'
    });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  let createdUser;
  await db.transaction(async trx => {
    const primary_hotel_id = hotel_ids && hotel_ids.length > 0 ? hotel_ids[0] : null;
    const [user] = await trx('users').insert({
      username: sanitize(username),
      email: cleanEmail,
      password_hash: passwordHash,
      full_name: sanitize(full_name),
      role,
      is_active: true,
      primary_hotel_id,
      force_password_change: !!force_password_change,
      password_changed_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    }).returning(['id', 'username', 'email', 'full_name', 'role', 'primary_hotel_id']);
    createdUser = user;
    if (hotel_ids && hotel_ids.length > 0) {
      const hotelInserts = hotel_ids.map(hotelId => ({
        user_id: user.id,
        hotel_id: hotelId
      }));
      await trx('user_hotels').insert(hotelInserts);
    }
  });
  
  await updatePasswordHistory(createdUser.id, passwordHash);

  await createAuditEntry(req.user.id, 'user_created', 'user', createdUser.id, req.ip, req.headers['user-agent'], {
    username: createdUser.username,
    role: createdUser.role
  });
  res.status(201).json({
    user: createdUser
  });
}));

// PUT /api/users/profile — Update own profile
router.put('/profile', authenticate, upload.single('avatar'), asyncHandler(async (req, res) => {
  const {
    full_name
  } = req.body;
  const updates = {
    updated_at: new Date()
  };
  if (full_name) updates.full_name = sanitize(full_name);
  if (req.file) {
    const normalizedPath = req.file.path.replace(/\\/g, '/');
    const parts = normalizedPath.split('/');
    const filename = parts.pop();
    const dateFolder = parts.pop();
    updates.avatar_url = `/uploads/${dateFolder}/${filename}`;
  }
  await db('users').where({
    id: req.user.id
  }).update(updates);
  const user = await db('users').select('id', 'username', 'email', 'full_name', 'role', 'avatar_url', 'is_active').where({
    id: req.user.id
  }).first();
  res.json({
    user,
    message: 'Profile updated successfully.'
  });
}));

// PUT /api/users/:id
router.put('/:id', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const {
    full_name,
    role,
    is_active,
    email,
    hotel_ids,
    force_password_change
  } = req.body;
  const updates = {
    updated_at: new Date()
  };
  if (full_name) updates.full_name = sanitize(full_name);
  if (role && ['admin', 'manager', 'technician', 'staff'].includes(role)) updates.role = role;
  if (is_active !== undefined) updates.is_active = is_active;
  if (force_password_change !== undefined) updates.force_password_change = !!force_password_change;
  if (email) {
    const cleanEmail = email.trim();
    const existing = await db('users').whereRaw('LOWER(email) = LOWER(?)', [cleanEmail]).whereNot('id', req.params.id).first();
    if (existing) {
      return res.status(409).json({
        error: 'A user with this email already exists.'
      });
    }
    updates.email = cleanEmail.toLowerCase();
  }
  await db.transaction(async trx => {
    // If hotel_ids is provided, update hotels
    if (hotel_ids !== undefined) {
      updates.primary_hotel_id = hotel_ids && hotel_ids.length > 0 ? hotel_ids[0] : null;
      await trx('user_hotels').where('user_id', req.params.id).del();
      if (hotel_ids && hotel_ids.length > 0) {
        const hotelInserts = hotel_ids.map(hotelId => ({
          user_id: req.params.id,
          hotel_id: hotelId
        }));
        await trx('user_hotels').insert(hotelInserts);
      }
    }
    await trx('users').where({
      id: req.params.id
    }).update(updates);
  });
  await createAuditEntry(req.user.id, 'user_updated', 'user', parseInt(req.params.id), req.ip, req.headers['user-agent'], {
    fields: Object.keys(updates)
  });
  const user = await db('users').select('id', 'username', 'email', 'full_name', 'role', 'is_active', 'primary_hotel_id').where({
    id: req.params.id
  }).first();

  // Fetch updated hotels
  const userHotels = await db('user_hotels').where('user_id', req.params.id);
  user.hotel_ids = userHotels.map(uh => uh.hotel_id);
  res.json({
    user
  });
}));

// PUT /api/users/:id/reset-password (Admin or Manager)
router.put('/:id/reset-password', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const {
    new_password
  } = req.body;
  if (!new_password) {
    return res.status(400).json({ error: 'Password is required.' });
  }
  const complexityError = checkPasswordComplexity(new_password);
  if (complexityError) {
    return res.status(400).json({ error: complexityError });
  }
  const passwordHash = await bcrypt.hash(new_password, 12);
  await db('users').where({
    id: req.params.id
  }).update({
    password_hash: passwordHash,
    failed_login_attempts: 0,
    locked_until: null,
    password_changed_at: new Date(),
    updated_at: new Date()
  });
  
  await updatePasswordHistory(req.params.id, passwordHash);
  await createAuditEntry(req.user.id, 'password_reset', 'user', parseInt(req.params.id), req.ip, req.headers['user-agent'], {});
  res.json({
    message: 'Password has been reset.'
  });
}));

// POST /api/users/:id/reset-mfa (Admin only)
router.post('/:id/reset-mfa', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  await db('users').where({
    id: req.params.id
  }).update({
    mfa_enabled: false,
    mfa_secret: null,
    mfa_backup_codes: null,
    mfa_verified_at: null,
    updated_at: new Date()
  });
  await createAuditEntry(req.user.id, 'mfa_reset', 'user', parseInt(req.params.id), req.ip, req.headers['user-agent'], {});
  res.json({
    message: 'User MFA has been reset.'
  });
}));

// POST /api/users/:id/unlock (Admin only)
router.post('/:id/unlock', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const user = await db('users').where({
    id: req.params.id
  }).first();
  if (!user) return res.status(404).json({
    error: 'User not found.'
  });
  await db('users').where({
    id: req.params.id
  }).update({
    locked_until: null,
    failed_login_attempts: 0,
    updated_at: new Date()
  });
  await createAuditEntry(req.user.id, 'account_unlocked', 'user', parseInt(req.params.id), req.ip, req.headers['user-agent'], {});
  res.json({
    message: 'User account has been unlocked.'
  });
}));

// DELETE /api/users/:id — Soft delete (Admin only)
router.delete('/:id', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({
      error: 'You cannot delete your own account.'
    });
  }
  await db('users').where({
    id: req.params.id
  }).update({
    deleted_at: new Date(),
    is_active: false,
    updated_at: new Date()
  });
  await createAuditEntry(req.user.id, 'user_deleted', 'user', parseInt(req.params.id), req.ip, req.headers['user-agent'], {});
  res.json({
    message: 'User has been deactivated.'
  });
}));
export default router;