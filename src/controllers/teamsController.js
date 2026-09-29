const prisma = require('../config/prisma');
const { statusForDates, completeAndEmptyTeamsOps } = require('../utils/teamStatus');

function includeRelations() {
  return {
    supervisor: { select: { id: true, firstName: true, lastName: true, email: true } },
    interns: { select: { id: true, firstName: true, lastName: true, email: true } },
  };
}

// Teams an applicant can still ask to join — Completed/Cancelled ones are
// over. Also used to validate a submitted preference (applicationsController).
const OPEN_TEAM_STATUSES = ['Planned', 'Active'];

// Used by the public application form (no login yet) to populate the
// "preferred team" dropdown. Deliberately excludes supervisor/intern
// personal data — unlike listTeams, this is reachable without auth.
async function listPublicTeams(req, res) {
  try {
    const teams = await prisma.team.findMany({
      where: { status: { in: OPEN_TEAM_STATUSES } },
      select: { id: true, name: true, nameFr: true, nameAr: true, status: true },
      orderBy: { id: 'asc' },
    });
    return res.json(teams);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

async function listTeams(req, res) {
  try {
    const teams = await prisma.team.findMany({
      include: includeRelations(),
      orderBy: { id: 'asc' },
    });
    return res.json(teams);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

async function getTeam(req, res) {
  try {
    const team = await prisma.team.findUnique({
      where: { id: Number(req.params.id) },
      include: includeRelations(),
    });
    if (!team) return res.status(404).json({ message: 'Team not found.' });
    return res.json(team);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

async function createTeam(req, res) {
  try {
    // status is not taken from the request: it follows the dates (utils/teamStatus).
    const { name, nameFr, nameAr, description, startDate, endDate, supervisorId } = req.body;
    if (!name || !startDate || !endDate) {
      return res.status(400).json({ message: 'name, startDate and endDate are required.' });
    }

    const team = await prisma.team.create({
      data: {
        name,
        nameFr,
        nameAr,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: statusForDates(startDate, endDate),
        // A team created already finished (past dates) gets no supervisor.
        supervisorId: supervisorId && statusForDates(startDate, endDate) !== 'Completed' ? Number(supervisorId) : null,
      },
      include: includeRelations(),
    });

    return res.status(201).json(team);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

async function updateTeam(req, res) {
  try {
    const id = Number(req.params.id);
    // status can't be edited directly: it follows the dates, and completing
    // early goes through completeTeam below.
    const { startDate, endDate, supervisorId, status: _ignored, ...rest } = req.body;
    const data = { ...rest };
    if (startDate) data.startDate = new Date(startDate);
    if (endDate) data.endDate = new Date(endDate);
    if (supervisorId !== undefined) data.supervisorId = supervisorId ? Number(supervisorId) : null;

    const existing = await prisma.team.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Team not found.' });

    // A Completed team has no members and gets no new supervisor.
    if (existing.status === 'Completed' && data.supervisorId) {
      return res.status(400).json({ message: 'This team is completed: it cannot get a supervisor.' });
    }

    // New dates on a Planned/Active team -> recompute its status right away
    // (a Completed or Cancelled team stays as it is).
    if ((startDate || endDate) && ['Planned', 'Active'].includes(existing.status)) {
      data.status = statusForDates(data.startDate || existing.startDate, data.endDate || existing.endDate);
    }

    // The new dates end the team: save the edit, then empty it.
    if (data.status === 'Completed') {
      delete data.supervisorId;
      await prisma.$transaction([prisma.team.update({ where: { id }, data }), ...completeAndEmptyTeamsOps([id])]);
      return res.json(await prisma.team.findUnique({ where: { id }, include: includeRelations() }));
    }

    const team = await prisma.team.update({
      where: { id },
      data,
      include: includeRelations(),
    });
    return res.json(team);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

// Admin: mark a team Completed now, even before its end date. Final — the
// automatic status update never reopens it. Like an automatic completion,
// the team is emptied: its interns leave it and its supervisor is removed.
async function completeTeam(req, res) {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.team.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Team not found.' });
    if (!['Planned', 'Active'].includes(existing.status)) {
      return res.status(400).json({ message: `This team is already ${existing.status}.` });
    }
    await prisma.$transaction(completeAndEmptyTeamsOps([id]));
    return res.json(await prisma.team.findUnique({ where: { id }, include: includeRelations() }));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

module.exports = { OPEN_TEAM_STATUSES, listPublicTeams, listTeams, getTeam, createTeam, updateTeam, completeTeam };