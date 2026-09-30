const prisma = require('../config/prisma');
const { createNotification } = require('../utils/notifications');

async function approveDocument(req, res) {
  try {
    const id = Number(req.params.id);
    if (!(await prisma.document.findUnique({ where: { id } }))) {
      return res.status(404).json({ message: 'Document not found.' });
    }
    const document = await prisma.document.update({
      where: { id },
      data: { status: 'Approved', rejectionReason: '' },
    });
    await prisma.documentRequest.update({ where: { id: document.requestId }, data: { status: 'Approved' } });

    await createNotification({
      userId: document.internId,
      titleKey: 'notifications.documentApproved.title',
      messageKey: 'notifications.documentApproved.message',
      params: { fileName: document.fileName },
      notificationType: 'Document',
      link: '/intern/documents',
    });

    return res.json(document);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

async function rejectDocument(req, res) {
  try {
    const id = Number(req.params.id);
    const { rejectionReason } = req.body;
    if (!rejectionReason || !String(rejectionReason).trim()) {
      return res.status(400).json({ message: 'rejectionReason is required.' });
    }
    if (!(await prisma.document.findUnique({ where: { id } }))) {
      return res.status(404).json({ message: 'Document not found.' });
    }
    const document = await prisma.document.update({
      where: { id },
      data: { status: 'Rejected', rejectionReason: rejectionReason || '' },
    });
    await prisma.documentRequest.update({
      where: { id: document.requestId },
      data: { status: 'Rejected', rejectionReason: rejectionReason || '' },
    });

    await createNotification({
      userId: document.internId,
      titleKey: 'notifications.documentRejected.title',
      messageKey: 'notifications.documentRejected.message',
      params: { fileName: document.fileName, reason: rejectionReason },
      notificationType: 'Document',
      link: '/intern/documents',
    });

    return res.json(document);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

module.exports = { approveDocument, rejectDocument };
