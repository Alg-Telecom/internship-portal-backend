const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { signToken } = require('../utils/jwt');

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const matches = await bcrypt.compare(password, user.password);
    if (!matches) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(user);

    res.cookie('imp_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const { password: _password, ...safeUser } = user;
    return res.json(safeUser);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

async function logout(req, res) {
  res.clearCookie('imp_token');
  return res.json({ message: 'Logged out.' });
}

async function me(req, res) {
  // requireAuth middleware already put the user on req.user
  return res.json(req.user);
}

module.exports = { login, logout, me };