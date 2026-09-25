const express = require('express');
const {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  updateOwnProfile,
  uploadOwnPhoto,
  deactivateOwnAccount,
} = require('../controllers/usersController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.use(requireAuth); // every route below requires a logged-in user

router.patch('/me', updateOwnProfile);
router.post('/me/photo', upload.single('photo'), uploadOwnPhoto);
router.post('/me/deactivate', deactivateOwnAccount);

// Read access is also open to supervisors — they legitimately need to look
// up interns (their own team's members, to record attendance, create
// assignments, etc.) and other supervisors (AssignMembersDialog shows how
// many teams each one already has). Creating/editing/deleting accounts
// stays admin-only.
router.get('/', requireRole('admin', 'supervisor'), listUsers);
router.get('/:id', requireRole('admin', 'supervisor'), getUser);
router.post('/', requireRole('admin'), createUser);
router.patch('/:id', requireRole('admin'), updateUser);
router.delete('/:id', requireRole('admin'), deleteUser);

module.exports = router;
