import crypto from 'crypto';
import fs from 'fs';
import multer from 'multer';
import path from 'path';

const uploadDir = path.resolve(process.cwd(), 'uploads/doctor-documents');
fs.mkdirSync(uploadDir, { recursive: true });

// Extension is derived from the (already fileFilter-validated) mimetype, not
// from the client-supplied filename — file.originalname never touches the
// constructed path at all, closing off path traversal via a crafted
// filename (e.g. "../../../etc/x.pdf") rather than just sanitizing it.
const EXTENSION_BY_MIMETYPE: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

// Configures WHERE and HOW uploaded files get saved to disk
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = EXTENSION_BY_MIMETYPE[file.mimetype] ?? '';
    // crypto, not Math.random, for the same reason credentialGenerator.ts
    // uses it — this value ends up in a public-facing file path.
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, uniqueName);
  },
});

// Only accept PDF and common image formats — reasonable restriction
// for certificate/document uploads
function fileFilter(req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, JPG, and PNG files are allowed'));
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max — reasonable for a certificate scan
});