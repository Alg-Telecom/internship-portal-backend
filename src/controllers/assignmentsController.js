const prisma = require('../config/prisma');
const { createNotification } = require('../utils/notifications');

function scopeWhere(req, where = {}) {
  // Non-admins only ever see their own assignments — an intern's or a
  // supervisor's own id always wins over whatever filter they passed in.
  if (req.user.role === 'intern') return { ...where, internId: req.user.id };
  if (req.user.role === 'supervisor') return { ...where, supervisorId: req.user.id };
  return where;
}

async function listAssignments(req, res) {
  try {
    const { teamId, internId, supervisorId, status } = req.query;
    let where = {};
    if (teamId) where.teamId = Number(teamId);
    if (internId) where.internId = Number(internId);
    if (supervisorId) where.supervisorId = Number(supervisorId);
    if (status) where.status = status;
    where = scopeWhere(req, where);

    const assignments = await prisma.assignment.findMany({
      where,
      include: { submissions: true },
      orderBy: { deadline: 'asc' },
    });
    return res.json(assignments);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

async function getAssignment(req, res) {
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: Number(req.params.id) },
      include: { submissions: true },
    });
    if (!assignment) return res.status(404).json({ message: 'Assignment not found.' });

    if (req.user.role === 'intern' && assignment.internId !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to do this.' });
    }
    if (req.user.role === 'supervisor' && assignment.supervisorId !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to do this.' });
    }

    return res.json(assignment);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

async function createAssignment(req, res) {
  try {
    const { teamId, internId, title, description, deadline, priority } = req.body;
    if (!teamId || !internId || !title || !description || !deadline) {
      return res.status(400).json({ message: 'teamId, internId, title, description and deadline are required.' });
    }

    // A supervisor creating an assignment is always its supervisor; only
    // an admin can assign work on a supervisor's behalf via supervisorId.
    const supervisorId = req.user.role === 'supervisor' ? req.user.id : Number(req.body.supervisorId);
    if (!supervisorId) {
      return res.status(400).json({ message: 'supervisorId is required.' });
    }

    const assignment = await prisma.assignment.create({
      data: {
        teamId: Number(teamId),
        supervisorId,
        internId: Number(internId),
        title,
        description,
        deadline: new Date(deadline),
        priority: priority || 'Medium',
      },
    });

    await createNotification({
      userId: assignment.internId,
      titleKey: 'notifications.newAssignment.title',
      messageKey: 'notifications.newAssignment.message',
      params: { title: assignment.title },
      notificationType: 'Assignment',
      link: `/intern/assignments/${assignment.id}`,
    });

    return res.status(201).json(assignment);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

async function updateAssignment(req, res) {
  try {
    const id = Number(req.params.id);
    const assignment = await prisma.assignment.findUnique({ where: { id } });
    if (!assignment) return res.status(404).json({ message: 'Assignment not found.' });
    if (req.user.role === 'supervisor' && assignment.supervisorId !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to do this.' });
    }

    const { deadline, ...rest } = req.body;
    const data = { ...rest };
    if (deadline) data.deadline = new Date(deadline);

    const updated = await prisma.assignment.update({ where: { id }, data });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

// Intern submits their work for an assignment — a single uploaded file
// (multer's upload.single('file')) plus optional notes.
async function submitWork(req, res) {
  try {
    const assignmentId = Number(req.params.id);
    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) return res.status(404).json({ message: 'Assignment not found.' });
    if (assignment.internId !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to do this.' });
    }

    const file = req.file;
    if (!file) return res.status(400).json({ message: 'A file is required.' });

    const submission = await prisma.submission.create({
      data: {
        assignmentId,
        internId: req.user.id,
        fileName: file.originalname,
        fileUrl: `/uploads/${file.filename}`,
        notes: req.body.notes || '',
        status: 'Submitted',
      },
    });

    await prisma.assignment.update({ where: { id: assignmentId }, data: { status: 'Submitted' } });

    await createNotification({
      userId: assignment.supervisorId,
      titleKey: 'notifications.assignmentSubmitted.title',
      messageKey: 'notifications.assignmentSubmitted.message',
      params: { title: assignment.title },
      notificationType: 'Assignment',
      link: `/supervisor/assignments/${assignment.id}`,
    });

    return res.status(201).json(submission);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

module.exports = { listAssignments, getAssignment, createAssignment, updateAssignment, submitWork };
