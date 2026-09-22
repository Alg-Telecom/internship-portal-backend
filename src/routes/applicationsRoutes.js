const express = require('express');
const {
  checkEmailExists,
  submitApplication,
  listApplications,
  getApplication,
  acceptApplication,
  rejectApplication,
  approveApplicationDocument,
} = require('../controllers/applicationsController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { upload } = require('../middleware/upload');
const { validateApplicationFileSizes } = require('../middleware/validateApplicationFileSizes');

const router = express.Router();

router.get('/check-email', checkEmailExists);
router.post(
  '/',
  upload.fields([
    { name: 'cvFile', maxCount: 1 },
    { name: 'photoFile', maxCount: 1 },
    { name: 'agreementFile', maxCount: 1 },
    { name: 'internshipRequestFile', maxCount: 1 },
    { name: 'otherDocuments', maxCount: 5 },
  ]),
  validateApplicationFileSizes,
  submitApplication
);

router.get('/', requireAuth, requireRole('admin'), listApplications);
router.get('/:id', requireAuth, requireRole('admin'), getApplication);
router.post('/:id/accept', requireAuth, requireRole('admin'), acceptApplication);
router.post('/:id/reject', requireAuth, requireRole('admin'), rejectApplication);
router.post('/:id/approve-document', requireAuth, requireRole('admin'), approveApplicationDocument);

module.exports = router;
