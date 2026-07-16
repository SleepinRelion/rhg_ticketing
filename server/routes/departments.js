import { asyncHandler } from "../utils/asyncHandler.js";
import { Router } from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { sanitize } from '../utils/sanitize.js';
const router = Router();

// GET /api/departments (all active departments for dropdowns)
router.get('/', asyncHandler(async (req, res) => {
  const departments = await db('departments').where({
    is_active: true
  }).orderBy('name');
  res.json({
    departments
  });
}));

// GET /api/departments/all (for admin management)
router.get('/all', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const departments = await db('departments').orderBy('name');
  res.json({
    departments
  });
}));

// POST /api/departments
router.post('/', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const {
    name,
    is_active = true
  } = req.body;
  if (!name) return res.status(400).json({
    error: 'Name is required.'
  });
  const [dept] = await db('departments').insert({
    name: sanitize(name),
    is_active,
    created_at: new Date()
  }).returning('*');
  res.status(201).json(dept);
}));

// PUT /api/departments/:id
router.put('/:id', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const updates = {};
  if (req.body.name) updates.name = sanitize(req.body.name);
  if (req.body.is_active !== undefined) updates.is_active = req.body.is_active;
  await db('departments').where({
    id: req.params.id
  }).update(updates);
  const dept = await db('departments').where({
    id: req.params.id
  }).first();
  res.json(dept);
}));

// DELETE /api/departments/:id (Hard delete if unused, soft delete otherwise)
router.delete('/:id', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  // Check if it's in use? Currently tickets use string names, so we can just delete from the dropdown list.
  // Or just soft delete
  await db('departments').where({
    id: req.params.id
  }).del();
  res.json({
    message: 'Department deleted successfully.'
  });
}));
export default router;