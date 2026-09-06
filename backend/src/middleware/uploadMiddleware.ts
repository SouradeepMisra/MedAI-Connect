import fs from 'fs';
import multer from 'multer';
import path from 'path';

const uploadDir = path.resolve(process.cwd(), 'uploads/doctor-documents');
fs.mkdirSync(uploadDir, { recursive: true });

// Configures WHERE and HOW uploaded files get saved to disk
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Prefix with a timestamp to avoid two different doctors accidentally
    // overwriting each other's file if they happen to upload same-named files
    const uniqueName = `${Date.now()}-${file.originalname}`;
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