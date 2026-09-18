const express = require('express');
const {
  listAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  submitWork,
} = require('../controllers/assignmentsController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.use(requireAuth);

router.get('/', listAssignments);
router.get('/:id', getAssignment);
router.post('/', requireRole('admin', 'supervisor'), createAssignment);
router.patch('/:id', requireRole('admin', 'supervisor'), updateAssignment);
router.post('/:id/submissions', requireRole('intern'), upload.single('file'), submitWork);

module.exports = router;
