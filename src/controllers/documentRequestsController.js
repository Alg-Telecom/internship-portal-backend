const prisma = require('../config/prisma');
const { createNotification } = require('../utils/notifications');

async function listDocumentRequests(req, res) {
  try {
    const { internId, status } = req.query;
    let where = {};
    if (status) where.status = status;
    if (internId) where.internId = Number(internId);
    // Non-admins only ever see their own document requests.
    if (req.user.role !== 'admin') where.internId = req.user.id;

    const requests = await prisma.documentRequest.findMany({
      where,
      include: { documents: true },
      orderBy: { requestDate: 'desc' },
    });
    return res.json(requests);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

async function getDocumentRequest(req, res) {
  try {
    const request = await prisma.documentRequest.findUnique({
      where: { id: Number(req.params.id) },
      include: { documents: true },
    });
    if (!request) return res.status(404).json({ message: 'Document request not found.' });
    if (req.user.role !== 'admin' && request.internId !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to do this.' });
    }
    return res.json(request);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

async function createDocumentRequest(req, res) {
  try {
    const { internId, title, description, deadline } = req.body;
    if (!internId || !title || !description || !deadline) {
      return res.status(400).json({ message: 'internId, title, description and deadline are required.' });
    }

    const request = await prisma.documentRequest.create({
      data: {
        internId: Number(internId),
        adminId: req.user.id,
        title,
        description,
        deadline: new Date(deadline),
      },
    });

    await createNotification({
      userId: request.internId,
      titleKey: 'notifications.newDocumentRequest.title',
      messageKey: 'notifications.newDocumentRequest.message',
      params: { title: request.title },
      notificationType: 'Document',
      link: '/intern/documents',
    });

    return res.status(201).json(request);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

// Intern uploads a document against one of their requests — a single
// uploaded file (multer's upload.single('file')) plus a documentType.
async function uploadDocument(req, res) {
  try {
    const requestId = Number(req.params.id);
    const request = await prisma.documentRequest.findUnique({ where: { id: requestId } });
    if (!request) return res.status(404).json({ message: 'Document request not found.' });
    if (request.internId !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to do this.' });
    }

    const file = req.file;
    if (!file) return res.status(400).json({ message: 'A file is required.' });
    if (!req.body.documentType) return res.status(400).json({ message: 'documentType is required.' });

    const previousVersions = await prisma.document.findMany({ where: { requestId } });

    const document = await prisma.document.create({
      data: {
        requestId,
        internId: req.user.id,
        fileName: file.originalname,
        fileUrl: `/uploads/${file.filename}`,
        documentType: req.body.documentType,
        version: previousVersions.length + 1,
      },
    });

    await prisma.documentRequest.update({ where: { id: requestId }, data: { status: 'Submitted' } });

    await createNotification({
      userId: request.adminId,
      titleKey: 'notifications.documentSubmitted.title',
      messageKey: 'notifications.documentSubmitted.message',
      params: { title: request.title },
      notificationType: 'Document',
      link: `/admin/document-requests/${request.id}`,
    });

    return res.status(201).json(document);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
}

module.exports = { listDocumentRequests, getDocumentRequest, createDocumentRequest, uploadDocument };
