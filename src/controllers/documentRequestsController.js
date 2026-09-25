const prisma = require('../config/prisma');
const { createNotification } = require('../utils/notifications');
const { resolveUpload, discardUpload } = require('../utils/uploadTypes');

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
    // description ("instructions" in the form) is optional — stored as an
    // empty string since the column itself is non-nullable.
    if (!internId || !title || !deadline) {
      return res.status(400).json({ message: 'internId, title and deadline are required.' });
    }

    const request = await prisma.documentRequest.create({
      data: {
        internId: Number(internId),
        adminId: req.user.id,
        title,
        description: description || '',
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

// Intern uploads a document against one of their requests, as one of
// three types (req.body.uploadType, see utils/uploadTypes): a single File
// or a compressed folder (Archive) — via multer's upload.single('file') —
// or a Link (req.body.link). Plus a documentType.
async function uploadDocument(req, res) {
  try {
    const requestId = Number(req.params.id);
    const request = await prisma.documentRequest.findUnique({ where: { id: requestId } });
    if (!request) {
      discardUpload(req.file);
      return res.status(404).json({ message: 'Document request not found.' });
    }
    if (request.internId !== req.user.id) {
      discardUpload(req.file);
      return res.status(403).json({ message: 'You do not have permission to do this.' });
    }
    if (!req.body.documentType) {
      discardUpload(req.file);
      return res.status(400).json({ message: 'documentType is required.' });
    }

    const upload = resolveUpload(req);
    if (upload.error) return res.status(400).json({ message: upload.error });

    const previousVersions = await prisma.document.findMany({ where: { requestId } });

    const document = await prisma.document.create({
      data: {
        requestId,
        internId: req.user.id,
        uploadType: upload.uploadType,
        fileName: upload.fileName,
        fileUrl: upload.fileUrl,
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
