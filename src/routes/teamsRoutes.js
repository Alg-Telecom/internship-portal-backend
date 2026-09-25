const express = require('express');
const { listPublicTeams, listTeams, getTeam, createTeam, updateTeam } = require('../controllers/teamsController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();

// Public — the application form needs the team list before the applicant
// has an account, so this has to come before the requireAuth gate below.
router.get('/public', listPublicTeams);

router.use(requireAuth); // every route below requires a logged-in user

router.get('/', listTeams); // any logged-in role can view teams
router.get('/:id', getTeam);

router.post('/', requireRole('admin'), createTeam);
router.patch('/:id', requireRole('admin', 'supervisor'), updateTeam);

module.exports = router;
