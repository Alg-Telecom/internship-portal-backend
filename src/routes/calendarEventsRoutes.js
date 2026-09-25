const express = require('express');
const {
  listCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} = require('../controllers/calendarEventsController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth);

router.get('/', listCalendarEvents);
// Supervisors can add events too (e.g. team-specific milestones), but
// editing/deleting stays admin-only.
router.post('/', requireRole('admin', 'supervisor'), createCalendarEvent);
router.patch('/:id', requireRole('admin'), updateCalendarEvent);
router.delete('/:id', requireRole('admin'), deleteCalendarEvent);

module.exports = router;
