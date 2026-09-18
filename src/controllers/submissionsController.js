const prisma = require('../config/prisma');
const { createNotification } = require('../utils/notifications');

async function evaluateSubmission(req, res) {
  try {
    const id = Number(req.params.id);
    const { grade, feedback } = req.body;
    if (grade === undefined) return res.status(400).json({ message: 'grade is required.' });

    const submission = await prisma.submission.findUnique({ where: { id } });
    if (!submission) return res.status(404).json({ message: 'Submission not found.' });

    const assignment = await prisma.assignment.findUnique({ where: { id: submission.assignmentId } });
    if (req.user.role === 'supervisor' && assignment.supervisorId !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to do this.' });
    }

    const updated = await prisma.submission.update({
      where: { id },
      data: { grade: Number(grade), feedback: feedback || '', status: 'Accepted' },
    });
    await prisma.assignment.update({ where: { id: submission.assignmentId }, data: { status: 'Evaluated' } });

    await createNotification({
      userId: submission.internId,
      titleKey: 'notifications.assignmentGraded.title',
      messageKey: 'notifications.assignmentGraded.message',
      params: { grade },
      notificationType: 'Evaluation',
      link: `/intern/assignments/${submission.assignmentId}`,
    });

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

module.exports = { evaluateSubmission };
