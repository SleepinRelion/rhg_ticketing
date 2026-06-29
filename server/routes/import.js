import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { processImportedFiles } from '../services/importService.js';
import { createAuditEntry } from '../middleware/auditLog.js';
import fs from 'fs';
import path from 'path';

const router = Router();

const uploadDir = path.join(process.cwd(), 'uploads', 'imports');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit per file
});

// POST /api/import/legacy-excel
router.post('/legacy-excel', authenticate, authorize('admin', 'manager'), upload.array('files', 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded.' });
    }

    const results = await processImportedFiles(req.files, req.user.id);

    // Clean up uploaded files after processing
    for (const file of req.files) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }

    await createAuditEntry(req.user.id, 'legacy_data_imported', 'system', null, req.ip, req.headers['user-agent'], { files_count: req.files.length, results });

    res.json(results);
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Failed to process import.' });
  }
});

export default router;
