const prisma = require('../config/prisma');
const { sendMail } = require('./mailer');
const { assignmentDeadlineEmail, documentRequestDeadlineEmail } = require('./emailTemplates');

// This job runs once a day. To send each reminder exactly once instead of
// every day the item stays open, we only email on the one day that matches:
// exactly 1 day before the deadline ("due soon"), and exactly 1 day after
// it passes ("late"). A deadline that's further out, or that passed more
// than a day ago (e.g. the job didn't run for a few days), gets no email —
// only the "Late" status still applies as long as it's actually overdue.
function daysUntil(deadline, now) {
  return Math.ceil((new Date(deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

async function checkAssignmentDeadlines(now) {
  const openAssignments = await prisma.assignment.findMany({
    where: { status: { in: ['Pending', 'InProgress', 'Late'] } },
    include: { intern: true },
  });

  for (const assignment of openAssignments) {
    const daysLeft = daysUntil(assignment.deadline, now);
    const isOverdue = daysLeft < 0;

    // Keep the status accurate every day it's overdue, regardless of
    // whether today is the one day we also email about it.
    if (isOverdue && assignment.status !== 'Late') {
      await prisma.assignment.update({ where: { id: assignment.id }, data: { status: 'Late' } });
    }

    const isDueSoonToday = daysLeft === 1;
    const isNewlyLateToday = daysLeft === -1;
    if (!isDueSoonToday && !isNewlyLateToday) continue;

    const { subject, html } = assignmentDeadlineEmail({
      firstName: assignment.intern.firstName,
      title: assignment.title,
      deadline: assignment.deadline,
      isOverdue,
    });
    await sendMail({ to: assignment.intern.email, subject, html });
  }
}

async function checkDocumentRequestDeadlines(now) {
  // Only "Pending" (not yet submitted) requests need chasing — once the
  // intern has submitted something (status Submitted) it's waiting on the
  // admin instead, so no deadline reminder is due to the intern anymore.
  const openRequests = await prisma.documentRequest.findMany({
    where: { status: 'Pending' },
    include: { intern: true },
  });

  for (const request of openRequests) {
    const daysLeft = daysUntil(request.deadline, now);
    const isOverdue = daysLeft < 0;

    const isDueSoonToday = daysLeft === 1;
    const isNewlyLateToday = daysLeft === -1;
    if (!isDueSoonToday && !isNewlyLateToday) continue;

    const { subject, html } = documentRequestDeadlineEmail({
      firstName: request.intern.firstName,
      title: request.title,
      deadline: request.deadline,
      isOverdue,
    });
    await sendMail({ to: request.intern.email, subject, html });
  }
}

async function runDeadlineCheck() {
  const now = new Date();
  console.log('[deadline-check] running...');
  await checkAssignmentDeadlines(now);
  await checkDocumentRequestDeadlines(now);
  console.log('[deadline-check] done.');
}

module.exports = { runDeadlineCheck };
