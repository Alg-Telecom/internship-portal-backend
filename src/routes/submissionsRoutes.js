const express = require('express');
const { evaluateSubmission } = require('../controllers/submissionsController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth);

router.patch('/:id/evaluate', requireRole('admin', 'supervisor'), evaluateSubmission);

module.exports = router;
