const prisma = require('../config/prisma');

// A team's status follows its dates automatically:
//   before the start date            -> Planned
//   from the start date to end date  -> Active   (both days included)
//   after the end date               -> Completed
// An admin can also complete a team early (POST /teams/:id/complete).
// Completed and Cancelled are final: the automatic update never moves a
// team out of them, so a manually completed team stays completed.
// Days are calendar days in server local time, like deadlines.

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function statusForDates(startDate, endDate, now = new Date()) {
  const today = startOfDay(now);
  if (startOfDay(endDate) < today) return 'Completed';
  if (startOfDay(startDate) <= today) return 'Active';
  return 'Planned';
}

// A Completed team is emptied: its interns leave it (teamId = null, their
// accounts stay active) and its supervisor is unassigned. Used by the
// hourly job below, the admin's "Complete" button and date edits
// (teamsController). Returns Prisma operations to run in one transaction.
function completeAndEmptyTeamsOps(teamIds) {
  return [
    prisma.user.updateMany({ where: { teamId: { in: teamIds } }, data: { teamId: null } }),
    prisma.team.updateMany({ where: { id: { in: teamIds } }, data: { status: 'Completed', supervisorId: null } }),
  ];
}

// Hourly + on server start (see server.js): moves Planned/Active teams
// along as their dates are reached.
async function updateTeamStatuses(now = new Date()) {
  const today = startOfDay(now);
  const endedIds = (
    await prisma.team.findMany({
      where: { status: { in: ['Planned', 'Active'] }, endDate: { lt: today } },
      select: { id: true },
    })
  ).map((t) => t.id);
  const completed = { count: endedIds.length };
  if (endedIds.length) await prisma.$transaction(completeAndEmptyTeamsOps(endedIds));
  // Start date reached (today or earlier) but end date not passed yet.
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const activated = await prisma.team.updateMany({
    where: { status: 'Planned', startDate: { lt: tomorrow }, endDate: { gte: today } },
    data: { status: 'Active' },
  });
  if (completed.count || activated.count) {
    console.log(`[team-status] ${activated.count} team(s) now Active, ${completed.count} now Completed`);
  }
}

module.exports = { statusForDates, updateTeamStatuses, completeAndEmptyTeamsOps };
