const express = require('express');
const { approveDocument, rejectDocument } = require('../controllers/documentsController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth);

router.patch('/:id/approve', requireRole('admin'), approveDocument);
router.patch('/:id/reject', requireRole('admin'), rejectDocument);

module.exports = router;
