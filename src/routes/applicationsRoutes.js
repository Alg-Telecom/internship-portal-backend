const express = require('express');
const {
  checkEmailExists,
  submitApplication,
  listApplications,
  getApplication,
  acceptApplication,
  rejectApplication,
  approveApplicationDocument,
  cancelOwnApplication,
  cancelApplicationAsAdmin,
} = require('../controllers/applicationsController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { upload } = require('../middleware/upload');
const { validateApplicationFileSizes } = require('../middleware/validateApplicationFileSizes');
const { applicationSubmitLimiter, applicationCancelLimiter, emailCheckLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.get('/check-email', emailCheckLimiter, checkEmailExists);
// Public — the applicant has no account yet for a still-pending
// application, so this can't require login. Identified by the email and
// password they applied with.
router.post('/cancel', applicationCancelLimiter, cancelOwnApplication);
router.post(
  '/',
  applicationSubmitLimiter, // before the upload, so blocked spam never writes files
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
router.post('/:id/cancel', requireAuth, requireRole('admin'), cancelApplicationAsAdmin);

module.exports = router;
