const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const { notifyAdmins, createNotification } = require("../utils/notifications");

function stripPassword(application) {
  const { password, ...safe } = application;
  return safe;
}

async function checkEmailExists(req, res) {
  try {
    const email = (req.query.email || "").toLowerCase();
    if (!email) return res.json(false);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    const existingApplication = await prisma.application.findFirst({
      where: {
        email,
        status: { notIn: ["Rejected", "Cancelled"] },
      },
    });

    return res.json(Boolean(existingUser || existingApplication));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

async function submitApplication(req, res) {
  try {
    const body = req.body;
    const files = req.files || {};
    const passwordHash = await bcrypt.hash(body.password, 10);

    const cv = files.cvFile?.[0];
    const photo = files.photoFile?.[0];
    const agreement = files.agreementFile?.[0];
    const internshipRequest = files.internshipRequestFile?.[0];
    const otherDocuments = (files.otherDocuments || []).map((f) => ({
      label: f.originalname,
      fileName: f.originalname,
      fileUrl: `/uploads/${f.filename}`,
    }));

    const application = await prisma.application.create({
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        personalId: body.personalId,
        email: body.email,
        phone: body.phone,
        birthday: new Date(body.birthday),
        university: body.university,
        major: body.major,
        grade: body.grade,
        teamPreference: body.teamPreference,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        password: passwordHash,
        cvFileName: cv?.originalname,
        cvFileUrl: cv ? `/uploads/${cv.filename}` : undefined,
        photoFileName: photo?.originalname,
        photoFileUrl: photo ? `/uploads/${photo.filename}` : undefined,
        agreementFileName: agreement?.originalname,
        agreementFileUrl: agreement ? `/uploads/${agreement.filename}` : undefined,
        internshipRequestFileName: internshipRequest?.originalname,
        internshipRequestFileUrl: internshipRequest ? `/uploads/${internshipRequest.filename}` : undefined,
        otherDocuments,
      },
    });

    await notifyAdmins({
      titleKey: "notifications.newApplication.title",
      messageKey: "notifications.newApplication.message",
      params: {
        firstName: application.firstName,
        lastName: application.lastName,
      },
      notificationType: "Application",
      link: `/admin/applications/${application.id}`,
    });

    return res.status(201).json(stripPassword(application));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

async function listApplications(req, res) {
  try {
    const { status } = req.query;
    const applications = await prisma.application.findMany({
      where: status ? { status } : undefined,
      orderBy: { submissionDate: "desc" },
    });
    return res.json(applications.map(stripPassword));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

async function getApplication(req, res) {
  try {
    const application = await prisma.application.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!application)
      return res.status(404).json({ message: "Application not found." });
    return res.json(stripPassword(application));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

// Accepting an application creates the real intern account, reusing the
// password the applicant originally chose (already hashed on submit).
async function acceptApplication(req, res) {
  try {
    const id = Number(req.params.id);
    const application = await prisma.application.findUnique({ where: { id } });
    if (!application)
      return res.status(404).json({ message: "Application not found." });

    const intern = await prisma.user.create({
      data: {
        role: "intern",
        firstName: application.firstName,
        lastName: application.lastName,
        email: application.email,
        password: application.password, // already a bcrypt hash from submitApplication
        phoneNumber: application.phone,
        university: application.university,
        fieldOfStudy: application.major,
        academicLevel: application.grade,
        registrationDate: new Date(),
        isActive: true,
      },
    });

    const updated = await prisma.application.update({
      where: { id },
      data: { status: "Accepted", reviewedAt: new Date(), internId: intern.id },
    });

    await createNotification({
      userId: intern.id,
      titleKey: "notifications.applicationAccepted.title",
      messageKey: "notifications.applicationAccepted.message",
      params: {},
      notificationType: "Application",
      link: "/intern/dashboard",
    });

    return res.json(stripPassword(updated));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

async function rejectApplication(req, res) {
  try {
    const id = Number(req.params.id);
    const { rejectionReason } = req.body;
    const updated = await prisma.application.update({
      where: { id },
      data: {
        status: "Rejected",
        reviewedAt: new Date(),
        rejectionReason: rejectionReason || "",
      },
    });
    return res.json(stripPassword(updated));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

module.exports = {
  checkEmailExists,
  submitApplication,
  listApplications,
  getApplication,
  acceptApplication,
  rejectApplication,
};
