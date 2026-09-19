const express = require('express');
const {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  updateOwnProfile,
  uploadOwnPhoto,
} = require('../controllers/usersController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.use(requireAuth); // every route below requires a logged-in user

router.patch('/me', updateOwnProfile);
router.post('/me/photo', upload.single('photo'), uploadOwnPhoto);

router.get('/', requireRole('admin'), listUsers);
router.get('/:id', requireRole('admin'), getUser);
router.post('/', requireRole('admin'), createUser);
router.patch('/:id', requireRole('admin'), updateUser);
router.delete('/:id', requireRole('admin'), deleteUser);

module.exports = router;
