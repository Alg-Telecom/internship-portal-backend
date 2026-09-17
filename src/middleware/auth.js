const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/prisma');

async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.imp_token;
    if (!token) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    delete user.password; // never leak the hash to routes/response
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authenticated.' });
  }
}

module.exports = { requireAuth };