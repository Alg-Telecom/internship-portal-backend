const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    // Multer/busboy decode multipart filenames as latin1 by default, but
    // browsers send the actual bytes as UTF-8 — without this, accented
    // characters (é, à, ç...) come back mangled (e.g. "Ã©"). Re-decoding
    // the bytes as UTF-8 fixes it. This mutates the same `file` object
    // that becomes req.file/req.files, so every controller that reads
    // file.originalname downstream gets the corrected name for free.
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
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
