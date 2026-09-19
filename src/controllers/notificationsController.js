const prisma = require("../config/prisma");

async function listMyNotifications(req, res) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { creationDate: "desc" },
    });
    return res.json(notifications);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

async function markAsRead(req, res) {
  try {
    const id = Number(req.params.id);
    const notification = await prisma.notification.findUnique({
      where: { id },
    });
    if (!notification || notification.userId !== req.user.id) {
      return res.status(404).json({ message: "Notification not found." });
    }
    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

async function markAllAsRead(req, res) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    return res.json({ message: "All notifications marked as read." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

module.exports = { listMyNotifications, markAsRead, markAllAsRead };
