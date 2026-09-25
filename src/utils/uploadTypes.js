const fs = require('fs');
const path = require('path');

// An intern can hand in work (assignment submissions, requested documents)
// as a single File, a compressed folder (Archive: zip/rar/7z/tar...) of a
// whole project, or a Link (GitHub repo, shared Google Doc...). For a
// Link, fileName and fileUrl both hold the external URL itself.
// Keep in sync with frontend/src/lib/uploadTypes.js.
const UPLOAD_TYPES = ['File', 'Archive', 'Link'];
const ARCHIVE_EXTENSIONS = ['.zip', '.rar', '.7z', '.tar', '.gz', '.tgz', '.bz2', '.xz'];
const FILE_MAX_BYTES = 3 * 1024 * 1024;
const ARCHIVE_MAX_BYTES = 20 * 1024 * 1024;

// Multer has already written the file to disk by the time a controller
// runs — a rejected upload must not be left behind in /uploads.
function discardUpload(file) {
  if (file) fs.unlink(file.path, () => {});
}

function isArchiveName(name) {
  const lower = name.toLowerCase();
  return ARCHIVE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function parseHttpUrl(value) {
  try {
    const url = new URL(String(value).trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/**
 * Validates req.body.uploadType + req.file / req.body.link. Returns
 * { error } (and discards any uploaded file) or { uploadType, fileName,
 * fileUrl } ready to store.
 */
function resolveUpload(req) {
  const file = req.file;
  const uploadType = req.body.uploadType || 'File';
  const fail = (error) => {
    discardUpload(file);
    return { error };
  };

  if (!UPLOAD_TYPES.includes(uploadType)) return fail('uploadType must be File, Archive or Link.');

  if (uploadType === 'Link') {
    discardUpload(file);
    const url = parseHttpUrl(req.body.link);
    if (!url) return { error: 'A valid http(s) link is required.' };
    return { uploadType, fileName: url.href, fileUrl: url.href };
  }

  if (!file) return { error: 'A file is required.' };
  if (uploadType === 'Archive' && !isArchiveName(file.originalname)) {
    return fail(`A compressed folder must be one of: ${ARCHIVE_EXTENSIONS.join(', ')}.`);
  }
  const maxBytes = uploadType === 'Archive' ? ARCHIVE_MAX_BYTES : FILE_MAX_BYTES;
  if (file.size > maxBytes) return fail(`File is too large (max ${maxBytes / (1024 * 1024)}MB).`);

  return { uploadType, fileName: file.originalname, fileUrl: `/uploads/${path.basename(file.filename)}` };
}

module.exports = { resolveUpload, discardUpload };
