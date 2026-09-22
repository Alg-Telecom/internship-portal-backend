const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const { signToken } = require('../utils/jwt');
const { sendMail } = require('../utils/mailer');
const { forgotPasswordEmail, passwordWasResetEmail } = require('../utils/emailTemplates');

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

// req.user (from requireAuth) already has its password stripped, so we
// re-fetch the full row here to get the hash to compare against.
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'currentPassword and newPassword are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'newPassword must be at least 8 characters.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: passwordHash } });

    return res.json({ message: 'Password updated.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

// Step 1 of "forgot password": issue a one-time reset link by email.
// Always responds with the same generic message whether or not the email
// matches an account, so this form can't be used to find out who has one.
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const genericResponse = { message: 'If an account exists for that email, a reset link has been sent.' };
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return res.json(genericResponse);
    }

    // Only the hashed token is stored — same idea as a password hash — so
    // a leak of the database alone can't be used to reset someone's
    // password. The link emailed out carries the raw (unhashed) token.
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: hashedToken, resetPasswordExpires },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
    const { subject, html } = forgotPasswordEmail({ firstName: user.firstName, resetUrl });
    await sendMail({ to: user.email, subject, html });

    return res.json(genericResponse);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

// Step 2: the link from the email lands here with the raw token; if it
// still matches a stored (hashed) token that hasn't expired, set the new
// password and clear the token so the link can't be reused.
async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'token and newPassword are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'newPassword must be at least 8 characters.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await prisma.user.findFirst({
      where: { resetPasswordToken: hashedToken, resetPasswordExpires: { gt: new Date() } },
    });

    if (!user) {
      return res.status(400).json({ message: 'This reset link is invalid or has expired.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: passwordHash, resetPasswordToken: null, resetPasswordExpires: null },
    });

    // Let them know it happened, in case it wasn't them who reset it.
    const { subject, html } = passwordWasResetEmail({ firstName: user.firstName });
    await sendMail({ to: user.email, subject, html });

    return res.json({ message: 'Password updated. You can now log in with your new password.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

module.exports = { login, logout, me, changePassword, forgotPassword, resetPassword };
