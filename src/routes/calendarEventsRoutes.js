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
router.post('/', requireRole('admin'), createCalendarEvent);
router.patch('/:id', requireRole('admin'), updateCalendarEvent);
router.delete('/:id', requireRole('admin'), deleteCalendarEvent);

module.exports = router;
