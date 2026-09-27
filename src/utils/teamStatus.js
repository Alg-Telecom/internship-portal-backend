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

// Hourly + on server start (see server.js): moves Planned/Active teams
// along as their dates are reached.
async function updateTeamStatuses(now = new Date()) {
  const today = startOfDay(now);
  const completed = await prisma.team.updateMany({
    where: { status: { in: ['Planned', 'Active'] }, endDate: { lt: today } },
    data: { status: 'Completed' },
  });
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

module.exports = { statusForDates, updateTeamStatuses };
