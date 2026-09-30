const prisma = require('../config/prisma');

const EVENT_TYPES = ['start', 'end', 'holiday', 'event'];
const typeError = { message: `type must be one of: ${EVENT_TYPES.join(', ')}.` };

async function listCalendarEvents(req, res) {
  try {
    const events = await prisma.calendarEvent.findMany({ orderBy: { date: 'asc' } });
    return res.json(events);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

async function createCalendarEvent(req, res) {
  try {
    const { title, date, type } = req.body;
    if (!title || !date || !type) {
      return res.status(400).json({ message: 'title, date and type are required.' });
    }
    if (!EVENT_TYPES.includes(type)) return res.status(400).json(typeError);
    const event = await prisma.calendarEvent.create({
      data: { title, date: new Date(date), type },
    });
    return res.status(201).json(event);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

async function updateCalendarEvent(req, res) {
  try {
    const id = Number(req.params.id);
    const { date, ...rest } = req.body;
    if (rest.type !== undefined && !EVENT_TYPES.includes(rest.type)) return res.status(400).json(typeError);
    if (!(await prisma.calendarEvent.findUnique({ where: { id } }))) {
      return res.status(404).json({ message: 'Calendar event not found.' });
    }
    const data = { ...rest };
    if (date) data.date = new Date(date);
    const event = await prisma.calendarEvent.update({ where: { id }, data });
    return res.json(event);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

async function deleteCalendarEvent(req, res) {
  try {
    const id = Number(req.params.id);
    if (!(await prisma.calendarEvent.findUnique({ where: { id } }))) {
      return res.status(404).json({ message: 'Calendar event not found.' });
    }
    await prisma.calendarEvent.delete({ where: { id } });
    return res.json({ message: 'Calendar event deleted.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

module.exports = { listCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent };
