const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Banned executable file extensions
const BANNED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.php', '.js', '.vbs', '.dll', '.ps1', '.jar', '.scr', '.com', '.phtml'];

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBasename = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${cleanBasename}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // 1. Check banned extensions
  if (BANNED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`Security Error: Executable file types (${ext}) are not allowed!`), false);
  }

  // 2. Check allowed MIME types
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Invalid file type (${file.mimetype}). Allowed formats: JPG, PNG, WEBP, PDF, DOC, DOCX.`), false);
  }

  cb(null, true);
};

// 10MB general limit (per-file checks in controller for 5MB images vs 10MB documents)
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max limit
  }
});

module.exports = upload;
