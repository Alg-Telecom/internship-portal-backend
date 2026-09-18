const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = crypto.randomBytes(16).toString('hex');
    cb(null, `${uniqueName}${path.extname(file.originalname)}`);
  },
});

// Multer only supports one fileSize ceiling per request, not one per
// field, so this is set to the largest limit we allow anywhere (the
// "supplementary/other documents" field, 20MB) — the smaller 10MB limit
// for the 4 required documents (cv/photo/agreement/internshipRequest) is
// enforced per-field afterwards, in middleware/validateApplicationFileSizes.js.
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per file (ceiling)
});

module.exports = { upload };
