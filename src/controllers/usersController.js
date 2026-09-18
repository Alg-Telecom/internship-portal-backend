const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/prisma');

function generateTemporaryPassword() {
  return crypto.randomBytes(6).toString('hex');
}

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

module.exports = { listUsers, getUser, createUser, updateUser, updateOwnProfile };