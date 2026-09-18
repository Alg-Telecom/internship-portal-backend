const express = require('express');
const { listTeams, getTeam, createTeam, updateTeam } = require('../controllers/teamsController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth); // every route below requires a logged-in user

router.get('/', listTeams); // any logged-in role can view teams
router.get('/:id', getTeam);

router.post('/', requireRole('admin'), createTeam);
router.patch('/:id', requireRole('admin', 'supervisor'), updateTeam);

module.exports = router;