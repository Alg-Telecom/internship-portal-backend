const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { generateTemporaryPassword } = require('../utils/password');
const { sendMail } = require('../utils/mailer');
const { welcomeUserEmail } = require('../utils/emailTemplates');

function stripPassword(user) {
  const { password, ...safe } = user;
  return safe;
}

async function listUsers(req, res) {
  try {
    const { role } = req.query;
    const users = await prisma.user.findMany({
      where: role ? { role } : undefined,
      orderBy: { id: 'asc' },
    });
    return res.json(users.map(stripPassword));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

async function getUser(req, res) {
  try {
    const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    return res.json(stripPassword(user));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

async function createUser(req, res) {
  try {
    const { role, firstName, lastName, email, phoneNumber, ...rest } = req.body;
    if (!role || !firstName || !lastName || !email) {
      return res.status(400).json({ message: 'role, firstName, lastName and email are required.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'A user with this email already exists.' });
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const user = await prisma.user.create({
      data: {
        role,
        firstName,
        lastName,
        email,
        phoneNumber,
        password: passwordHash,
        isActive: true,
        ...rest, // specialization/department for supervisors, studentId/university/etc for interns
      },
    });

    // Announce the new account + generated password + role by email.
    const { subject, html } = welcomeUserEmail({
      firstName: user.firstName,
      email: user.email,
      temporaryPassword,
      role: user.role,
    });
    await sendMail({ to: user.email, subject, html });

    return res.status(201).json({ ...stripPassword(user), temporaryPassword });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

async function updateUser(req, res) {
  try {
    const id = Number(req.params.id);
    const { password, ...patch } = req.body; // never let this route touch the password
    const user = await prisma.user.update({ where: { id }, data: patch });
    return res.json(stripPassword(user));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

// Called by a logged-in user updating their own name (see SettingsPage.jsx)
async function updateOwnProfile(req, res) {
  try {
    const { firstName, lastName } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { firstName, lastName },
    });
    return res.json(stripPassword(user));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

// Admin-only hard delete. Users can be tied to assignments, submissions,
// documents, attendance, etc. — if any of those still reference this user,
// MySQL's foreign-key constraint rejects the delete (Prisma surfaces this
// as error code P2003), so we turn that into a clear 409 instead of a raw
// 500 and point the admin at deactivating the account instead.
//
// For an intern specifically, "finished everything they can" is a real,
// checkable state — no assignment still waiting on them or on grading, and
// no document request still open. Once that's true there's nothing left
// worth keeping around, so instead of just refusing the delete like every
// other role, we clear out that intern's own history (their assignments/
// submissions/attendance/document requests/documents/notifications, and
// detach their now-orphaned application) in one transaction and then
// remove the account itself. A supervisor/admin, or an intern who still
// has something pending, still hits the P2003 guard below as before.
async function deleteUser(req, res) {
  try {
    const id = Number(req.params.id);
    if (id === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'User not found.' });

    if (existing.role === 'intern') {
      const pendingAssignments = await prisma.assignment.count({
        where: { internId: id, status: { in: ['Pending', 'InProgress', 'Submitted', 'Late'] } },
      });
      const pendingDocumentRequests = await prisma.documentRequest.count({
        where: { internId: id, status: { in: ['Pending', 'Submitted', 'Late'] } },
      });
      if (pendingAssignments > 0 || pendingDocumentRequests > 0) {
        return res.status(400).json({
          message: `This intern still has ${pendingAssignments} pending assignment(s) and ${pendingDocumentRequests} pending document request(s). Those need to be resolved first — or deactivate the account instead.`,
        });
      }

      const documentRequestIds = (
        await prisma.documentRequest.findMany({ where: { internId: id }, select: { id: true } })
      ).map((dr) => dr.id);
      const assignmentIds = (
        await prisma.assignment.findMany({ where: { internId: id }, select: { id: true } })
      ).map((a) => a.id);

      await prisma.$transaction([
        prisma.notification.deleteMany({ where: { userId: id } }),
        prisma.document.deleteMany({ where: { requestId: { in: documentRequestIds } } }),
        prisma.documentRequest.deleteMany({ where: { id: { in: documentRequestIds } } }),
        prisma.submission.deleteMany({ where: { assignmentId: { in: assignmentIds } } }),
        prisma.assignment.deleteMany({ where: { id: { in: assignmentIds } } }),
        prisma.attendance.deleteMany({ where: { internId: id } }),
        // The application that got this intern accepted still exists as a
        // historical record — just detach it rather than delete it too.
        prisma.application.updateMany({ where: { internId: id }, data: { internId: null } }),
        prisma.user.delete({ where: { id } }),
      ]);
      return res.status(204).send();
    }

    await prisma.user.delete({ where: { id } });
    return res.status(204).send();
  } catch (err) {
    if (err.code === 'P2003') {
      return res.status(409).json({
        message: 'This user has related records (assignments, submissions, documents, etc.) and cannot be deleted. Deactivate the account instead.',
      });
    }
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

// Called by a logged-in user uploading their own profile photo (see
// SettingsPage.jsx / ProfilePhotoField.jsx) — multer (upload.single('photo'))
// has already saved the file to disk by the time this runs.
async function uploadOwnPhoto(req, res) {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'A photo file is required.' });

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { profilePhotoUrl: `/uploads/${file.filename}` },
    });
    return res.json(stripPassword(user));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

// Called by a logged-in user (typically an intern) who wants to withdraw
// themselves — same effect as an admin deactivating the account (isActive:
// false), plus we clear the session cookie so they're signed out right
// away instead of staying logged in on a now-deactivated account until
// their token expires.
async function deactivateOwnAccount(req, res) {
  try {
    await prisma.user.update({ where: { id: req.user.id }, data: { isActive: false } });
    res.clearCookie('imp_token');
    return res.json({ message: 'Account deactivated.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

module.exports = {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  updateOwnProfile,
  uploadOwnPhoto,
  deactivateOwnAccount,
};
