const express = require('express');
const {
  listDocumentRequests,
  getDocumentRequest,
  createDocumentRequest,
  uploadDocument,
} = require('../controllers/documentRequestsController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.use(requireAuth);

router.get('/', listDocumentRequests);
router.get('/:id', getDocumentRequest);
router.post('/', requireRole('admin'), createDocumentRequest);
router.post('/:id/documents', requireRole('intern'), upload.single('file'), uploadDocument);

module.exports = router;
