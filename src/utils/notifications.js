const prisma = require('../config/prisma');

async function createNotification({ userId, titleKey, messageKey, params, notificationType, link }) {
  return prisma.notification.create({
    data: {
      userId,
      titleKey,
      messageKey,
      params: params || undefined,
      notificationType,
      link,
    },
  });
}

async function notifyAdmins({ titleKey, messageKey, params, notificationType, link }) {
  const admins = await prisma.user.findMany({ where: { role: 'admin', isActive: true } });
  return Promise.all(
    admins.map((admin) =>
      createNotification({ userId: admin.id, titleKey, messageKey, params, notificationType, link })
    )
  );
}

module.exports = { createNotification, notifyAdmins };