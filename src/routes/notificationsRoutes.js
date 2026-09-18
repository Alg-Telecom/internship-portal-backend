const express = require('express');
const { listMyNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationsController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', listMyNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);

module.exports = router;