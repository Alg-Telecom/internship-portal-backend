const express = require('express');
const {
  listUsers,
  getUser,
  createUser,
  updateUser,
  updateOwnProfile,
} = require('../controllers/usersController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth); // every route below requires a logged-in user

router.patch('/me', updateOwnProfile);

router.get('/', requireRole('admin'), listUsers);
router.get('/:id', requireRole('admin'), getUser);
router.post('/', requireRole('admin'), createUser);
router.patch('/:id', requireRole('admin'), updateUser);

module.exports = router;