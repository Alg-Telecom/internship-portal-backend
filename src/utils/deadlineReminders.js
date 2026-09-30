const prisma = require('../config/prisma');
const { sendMail } = require('./mailer');
const { assignmentDeadlineEmail, documentRequestDeadlineEmail } = require('./emailTemplates');

// Each open item gets at most two reminder emails: one the day BEFORE its
// deadline ("DueSoon") and one the day AFTER it ("Late").
//
// The check runs daily at 08:00 AND on every server start (see server.js),
// and in development nodemon restarts the server on every file save — so
// "is today the right day?" alone isn't enough, it used to re-send the
// same email on every restart. Every email actually sent is therefore
// recorded in ReminderLog, and a (item, kind, deadline) that's already
// logged is never emailed again, however many times the check runs.
//
// Days are compared as calendar days (server local time), not as rounded
// 24h spans, so "tomorrow"/"yesterday" doesn't depend on the time of day
// the check happens to run.
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function calendarDaysUntil(deadline, now) {
  return Math.round((startOfDay(deadline) - startOfDay(now)) / (1000 * 60 * 60 * 24));
}

function reminderKind(daysLeft) {
  if (daysLeft === 1) return 'DueSoon';
  if (daysLeft === -1) return 'Late';
  return null;
}

// Claims the reminder slot first (the unique index makes a second claim
// fail), then sends. If sending fails the claim is released so the next
// run retries instead of silently never sending.
async function sendOnce({ entityType, entityId, kind, deadline }, send) {
  let log;
  try {
    log = await prisma.reminderLog.create({ data: { entityType, entityId, kind, deadline } });
  } catch (err) {
    if (err.code === 'P2002') return; // already sent
    throw err;
  }
  let sent;
  try {
    // utils/mailer#sendMail never throws — it logs and returns null on
    // failure — so a null result counts as a failed send too.
    sent = await send();
  } catch {
    sent = null;
  }
  if (!sent) {
    await prisma.reminderLog.delete({ where: { id: log.id } }).catch(() => {});
    throw new Error(`reminder email not sent (${entityType} ${entityId} ${kind}), will retry on next check`);
  }
}

// Flips everything whose deadline day has passed without a submission to
// "Late": assignments still Pending/InProgress, and document requests still
// Pending (a Rejected request keeps its status — it carries the rejection
// reason the intern needs to see). The deadline day itself still counts
// as on time. Cheap (two UPDATEs), so it runs hourly as well as with the
// daily reminder check — see server.js.
async function markOverdueItems(now = new Date()) {
  const today = startOfDay(now);
  const assignments = await prisma.assignment.updateMany({
    where: { status: { in: ['Pending', 'InProgress'] }, deadline: { lt: today } },
    data: { status: 'Late' },
  });
  const requests = await prisma.documentRequest.updateMany({
    where: { status: 'Pending', deadline: { lt: today } },
    data: { status: 'Late' },
  });
  if (assignments.count || requests.count) {
    console.log(`[deadline-check] marked late: ${assignments.count} assignment(s), ${requests.count} document request(s)`);
  }
}

async function checkAssignmentDeadlines(now) {
  const openAssignments = await prisma.assignment.findMany({
    where: { status: { in: ['Pending', 'InProgress', 'Late'] } },
    include: { intern: true },
  });

  for (const assignment of openAssignments) {
    const kind = reminderKind(calendarDaysUntil(assignment.deadline, now));
    if (!kind) continue;

    try {
      await sendOnce({ entityType: 'Assignment', entityId: assignment.id, kind, deadline: assignment.deadline }, () => {
        const { subject, html } = assignmentDeadlineEmail({
          firstName: assignment.intern.firstName,
          title: assignment.title,
          deadline: assignment.deadline,
          isOverdue: kind === 'Late',
        });
        return sendMail({ to: assignment.intern.email, subject, html });
      });
    } catch (err) {
      console.error(`[deadline-check] assignment ${assignment.id} reminder failed:`, err);
    }
  }
}

async function checkDocumentRequestDeadlines(now) {
  // Only not-yet-submitted requests (Pending, or Late once the deadline
  // passed) need chasing — once the intern has submitted something it's
  // waiting on the admin instead, so no reminder is due to the intern.
  const openRequests = await prisma.documentRequest.findMany({
    where: { status: { in: ['Pending', 'Late'] } },
    include: { intern: true },
  });

  for (const request of openRequests) {
    const kind = reminderKind(calendarDaysUntil(request.deadline, now));
    if (!kind) continue;

    try {
      await sendOnce({ entityType: 'DocumentRequest', entityId: request.id, kind, deadline: request.deadline }, () => {
        const { subject, html } = documentRequestDeadlineEmail({
          firstName: request.intern.firstName,
          title: request.title,
          deadline: request.deadline,
          isOverdue: kind === 'Late',
        });
        return sendMail({ to: request.intern.email, subject, html });
      });
    } catch (err) {
      console.error(`[deadline-check] document request ${request.id} reminder failed:`, err);
    }
  }
}

async function runDeadlineCheck() {
  const now = new Date();
  console.log('[deadline-check] running...');
  await markOverdueItems(now);
  await checkAssignmentDeadlines(now);
  await checkDocumentRequestDeadlines(now);
  console.log('[deadline-check] done.');
}

module.exports = { runDeadlineCheck, markOverdueItems };
