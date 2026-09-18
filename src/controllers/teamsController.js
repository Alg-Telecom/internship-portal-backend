const prisma = require('../config/prisma');

function includeRelations() {
  return {
    supervisor: { select: { id: true, firstName: true, lastName: true, email: true } },
    interns: { select: { id: true, firstName: true, lastName: true, email: true } },
  };
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
    const { name, nameFr, nameAr, description, startDate, endDate, status, supervisorId } = req.body;
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
        status: status || 'Planned',
        supervisorId: supervisorId ? Number(supervisorId) : null,
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
    const { startDate, endDate, supervisorId, ...rest } = req.body;
    const data = { ...rest };
    if (startDate) data.startDate = new Date(startDate);
    if (endDate) data.endDate = new Date(endDate);
    if (supervisorId !== undefined) data.supervisorId = supervisorId ? Number(supervisorId) : null;

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

module.exports = { listTeams, getTeam, createTeam, updateTeam };