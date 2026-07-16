import { asyncHandler } from "../utils/asyncHandler.js";
import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { upload } from '../middleware/upload.js';
const router = Router();

// POST /api/attachments
router.post('/', authenticate, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({
    error: 'No file uploaded.'
  });
  const {
    ticket_id,
    intervention_id
  } = req.body;
  if (!ticket_id && !intervention_id) {
    return res.status(400).json({
      error: 'Either ticket_id or intervention_id is required.'
    });
  }
  const [attachment] = await db('attachments').insert({
    ticket_id: ticket_id || null,
    intervention_id: intervention_id || null,
    uploaded_by: req.user.id,
    file_name: req.file.originalname,
    storage_path: req.file.path,
    file_type: req.file.mimetype,
    file_size: req.file.size,
    created_at: new Date()
  }).returning('*');

  // Activity log
  if (ticket_id) {
    await db('activity_logs').insert({
      ticket_id: parseInt(ticket_id),
      user_id: req.user.id,
      action: 'attachment_added',
      new_value: req.file.originalname,
      created_at: new Date()
    });
  }
  res.status(201).json(attachment);
}));

// GET /api/attachments/:id/download
router.get('/:id/download', authenticate, asyncHandler(async (req, res) => {
  const attachment = await db('attachments').where({
    id: req.params.id
  }).first();
  if (!attachment) return res.status(404).json({
    error: 'Attachment not found.'
  });
  if (!fs.existsSync(attachment.storage_path)) {
    return res.status(404).json({
      error: 'File not found on server.'
    });
  }
  res.download(attachment.storage_path, attachment.file_name);
}));

// DELETE /api/attachments/:id
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const attachment = await db('attachments').where({
    id: req.params.id
  }).first();
  if (!attachment) return res.status(404).json({
    error: 'Attachment not found.'
  });

  // Only uploader, admin, or manager can delete
  if (attachment.uploaded_by !== req.user.id && !['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({
      error: 'You can only delete your own attachments.'
    });
  }

  // Delete file from disk
  if (fs.existsSync(attachment.storage_path)) {
    fs.unlinkSync(attachment.storage_path);
  }
  await db('attachments').where({
    id: req.params.id
  }).del();
  res.json({
    message: 'Attachment deleted.'
  });
}));
export default router;