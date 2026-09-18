const express = require('express');
const { listAttendance, markAttendance } = require('../controllers/attendanceController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth);

router.get('/', listAttendance);
router.post('/', requireRole('admin', 'supervisor'), markAttendance);

module.exports = router;
