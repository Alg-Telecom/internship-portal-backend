const fs = require('fs');

// multer's own `limits.fileSize` (set to 20MB in middleware/upload.js) is
// one ceiling for the whole request, so it can't tell the 4 required
// documents (max 10MB each) apart from the "other/supplementary
// documents" field (max 20MB). This middleware runs right after
// upload.fields(...) and enforces the tighter 10MB limit on just those 4
// fields — anything over 20MB was already rejected by multer itself.
const REQUIRED_DOCUMENT_FIELDS = ['cvFile', 'photoFile', 'agreementFile', 'internshipRequestFile'];
const MAX_REQUIRED_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10MB

function validateApplicationFileSizes(req, res, next) {
  const files = req.files || {};
  const oversized = [];

  for (const field of REQUIRED_DOCUMENT_FIELDS) {
    const file = files[field]?.[0];
    if (file && file.size > MAX_REQUIRED_DOCUMENT_BYTES) {
      oversized.push({ field, file });
    }
  }

  if (oversized.length === 0) return next();

  // Clean up every uploaded file for this request (including the ones
  // that were fine) — multer already saved them to disk before this
  // middleware runs, and since the whole submission is being rejected,
  // nothing should be left behind on disk.
  const allUploaded = Object.values(files).flat();
  for (const file of allUploaded) {
    fs.unlink(file.path, () => {}); // best-effort; ignore errors
  }

  return res.status(400).json({
    message: 'One or more files exceed the 10MB limit.',
    fields: oversized.map((o) => o.field),
  });
}

module.exports = { validateApplicationFileSizes };
