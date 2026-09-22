const prisma = require('../config/prisma');

// Built directly from the date string's own year/month/day, in UTC — never
// through a local Date + setHours(0,0,0,0). That local-time version could
// silently shift the calendar day by ±1 depending on the server's
// timezone, which desynced it from what MySQL's `date DATE` column
// actually stores. That mismatch was letting prisma.attendance.upsert()'s
// own "does this row already exist" lookup miss an existing row, fall
// through to CREATE, and then collide with the real (date-only) unique
// index — surfacing as a confusing P2002 on what should have been an
// update.
function startOfDay(dateStr) {
  const [year, month, day] = String(dateStr).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

async function listAttendance(req, res) {
  try {
    const { internId, from, to } = req.query;
    let where = {};
    if (internId) where.internId = Number(internId);
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = startOfDay(from);
      if (to) where.date.lte = startOfDay(to);
    }

    // Non-admins only ever see their own records: an intern sees their own
    // attendance, a supervisor sees only records they themselves recorded.
    if (req.user.role === 'intern') where.internId = req.user.id;
    else if (req.user.role === 'supervisor') where.supervisorId = req.user.id;

    const records = await prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
    });
    return res.json(records);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

// One attendance record per (intern, date) — marking the same intern on
// the same date again updates that day's record instead of duplicating it.
async function markAttendance(req, res) {
  try {
    const { internId, date, status, arrivalTime, departureTime, remarks } = req.body;
    if (!internId || !date || !status) {
      return res.status(400).json({ message: 'internId, date and status are required.' });
    }

    const day = startOfDay(date);
    const record = await prisma.attendance.upsert({
      where: { internId_date: { internId: Number(internId), date: day } },
      update: {
        status,
        arrivalTime: arrivalTime || null,
        departureTime: departureTime || null,
        remarks: remarks || '',
        supervisorId: req.user.id,
      },
      create: {
        internId: Number(internId),
        supervisorId: req.user.id,
        date: day,
        status,
        arrivalTime: arrivalTime || null,
        departureTime: departureTime || null,
        remarks: remarks || '',
      },
    });

    return res.status(201).json(record);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

module.exports = { listAttendance, markAttendance };
