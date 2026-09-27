const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const { notifyAdmins, createNotification } = require("../utils/notifications");
const { sendMail } = require("../utils/mailer");
const { discardUpload } = require("../utils/uploadTypes");
const { OPEN_TEAM_STATUSES } = require("./teamsController");
const {
  applicationAcceptedEmail,
  applicationRejectedEmail,
  cancelledByInternEmail,
  cancelledByAdminEmail,
} = require("../utils/emailTemplates");

// Maps the rejectedField the admin can send in POST /:id/reject (and now
// POST /:id/approve-document) to the matching per-document status/reason
// columns already on Application.
const REJECTABLE_FIELDS = {
  cv: {
    statusField: "cvStatus",
    reasonField: "cvRejectionReason",
    label: "CV",
  },
  photo: {
    statusField: "photoStatus",
    reasonField: "photoRejectionReason",
    label: "Photo",
  },
  agreement: {
    statusField: "agreementStatus",
    reasonField: "agreementRejectionReason",
    label: "Signed agreement",
  },
  internshipRequest: {
    statusField: "internshipRequestStatus",
    reasonField: "internshipRequestRejectionReason",
    label: "Internship request letter",
  },
};

// Never send either password field to a client: `password` is the bcrypt
// hash, `rawPassword` the applicant's plaintext password kept only until
// review so the acceptance email can include it (see acceptApplication).
function stripPassword(application) {
  const { password, rawPassword, ...safe } = application;
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

    // The preferred team must still be open (Planned/Active) — the form
    // only offers those, but a team can close while someone is applying.
    if (body.teamPreference && body.teamPreference !== "No preference") {
      const team = await prisma.team.findFirst({
        where: { name: body.teamPreference, status: { in: OPEN_TEAM_STATUSES } },
      });
      if (!team) {
        Object.values(files).flat().forEach(discardUpload);
        return res.status(400).json({
          code: "TEAM_UNAVAILABLE",
          message: "The team you chose is no longer available. Please choose another team.",
        });
      }
    }

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
        // Kept in plaintext only until this application is reviewed, so
        // the accept email can tell the applicant the password they
        // themselves chose — see acceptApplication/rejectApplication,
        // both of which null this back out once it's no longer needed.
        rawPassword: body.password,
        cvFileName: cv?.originalname,
        cvFileUrl: cv ? `/uploads/${cv.filename}` : undefined,
        photoFileName: photo?.originalname,
        photoFileUrl: photo ? `/uploads/${photo.filename}` : undefined,
        agreementFileName: agreement?.originalname,
        agreementFileUrl: agreement
          ? `/uploads/${agreement.filename}`
          : undefined,
        internshipRequestFileName: internshipRequest?.originalname,
        internshipRequestFileUrl: internshipRequest
          ? `/uploads/${internshipRequest.filename}`
          : undefined,
        otherDocuments,
      },
    });

    await notifyAdmins({
      titleKey: "notifications.newApplication.title",
      messageKey: "notifications.newApplication.message",
      // The translation string is '{name} submitted an internship
      // application.' — it needs a single `name` param, not
      // firstName/lastName separately, otherwise "{name}" shows up
      // literally, unsubstituted.
      params: {
        name: `${application.firstName} ${application.lastName}`,
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

// Accepting an application creates the real intern account. The intern
// logs in with the SAME password they chose when they applied — we reuse
// application.password (already a bcrypt hash from submitApplication)
// rather than generating a new one. That's different from usersController's
// createUser, where the admin is choosing the account for someone who
// never set a password themselves, so a system-generated temporary
// password makes sense there.
async function acceptApplication(req, res) {
  try {
    const id = Number(req.params.id);
    const application = await prisma.application.findUnique({ where: { id } });
    if (!application)
      return res.status(404).json({ message: "Application not found." });
    if (application.status !== "Pending") {
      return res
        .status(400)
        .json({ message: "This application has already been reviewed." });
    }

    // Resolve which team the new intern joins: an explicit admin choice
    // (req.body.teamId) always wins; otherwise fall back to matching the
    // applicant's own team preference by name.
    let teamId = req.body.teamId ? Number(req.body.teamId) : null;
    if (!teamId && application.teamPreference) {
      // Only an open team — if the preferred one has since been completed
      // or cancelled, the intern is left without a team for the admin to set.
      const preferredTeam = await prisma.team.findFirst({
        where: { name: application.teamPreference, status: { in: OPEN_TEAM_STATUSES } },
      });
      if (preferredTeam) teamId = preferredTeam.id;
    }

    const intern = await prisma.user.create({
      data: {
        role: "intern",
        firstName: application.firstName,
        lastName: application.lastName,
        email: application.email,
        password: application.password, // reuse the applicant's own hash
        phoneNumber: application.phone,
        studentId: application.personalId,
        university: application.university,
        fieldOfStudy: application.major,
        academicLevel: application.grade,
        registrationDate: new Date(),
        isActive: true,
        teamId: teamId || undefined,
      },
    });

    // Accepting the application also approves whichever of its documents
    // were actually submitted (only fields that have a fileUrl — a
    // document that was never uploaded stays Pending, there's nothing to
    // approve there). Documents already approved individually beforehand
    // (see approveApplicationDocument below) are simply reconfirmed here.
    const documentApprovals = {};
    if (application.cvFileUrl) documentApprovals.cvStatus = "Approved";
    if (application.photoFileUrl) documentApprovals.photoStatus = "Approved";
    if (application.agreementFileUrl)
      documentApprovals.agreementStatus = "Approved";
    if (application.internshipRequestFileUrl)
      documentApprovals.internshipRequestStatus = "Approved";

    // Grab the plaintext password now, before we null it out below — this
    // is the applicant's own chosen password, kept only for this email.
    const plainPassword = application.rawPassword;

    const updated = await prisma.application.update({
      where: { id },
      data: {
        status: "Accepted",
        reviewedAt: new Date(),
        internId: intern.id,
        rawPassword: null, // no longer needed once the email below is sent
        ...documentApprovals,
      },
    });

    const team = teamId
      ? await prisma.team.findUnique({ where: { id: teamId } })
      : null;

    // Mirrors the old mock backend's message selection: pick the variant
    // that matches whether the intern got their preferred team, got
    // overridden to a different one, got assigned one with no stated
    // preference, or (rarely) got no team at all yet. Team names in this
    // app already end in "Team" (e.g. "Network and Infrastructure Team"),
    // so the message text doesn't append its own "team" suffix — that
    // would read as "...Team team".
    const hasPreference =
      application.teamPreference && application.teamPreference !== "No preference";
    let messageKey = "notifications.applicationAccepted.messageDefault";
    const notificationParams = {};
    if (team && hasPreference && team.name === application.teamPreference) {
      messageKey = "notifications.applicationAccepted.messagePreferred";
      notificationParams.team = team.name;
    } else if (team && hasPreference) {
      messageKey = "notifications.applicationAccepted.messageOverridden";
      notificationParams.team = team.name;
      notificationParams.preferredTeam = application.teamPreference;
    } else if (team) {
      messageKey = "notifications.applicationAccepted.messageAssigned";
      notificationParams.team = team.name;
    }

    await createNotification({
      userId: intern.id,
      titleKey: "notifications.applicationAccepted.title",
      messageKey,
      params: notificationParams,
      notificationType: "Application",
      link: "/intern/dashboard",
    });

    const { subject, html } = applicationAcceptedEmail({
      firstName: intern.firstName,
      email: intern.email,
      password: plainPassword,
      teamName: team ? team.name : "To be assigned",
      preferredTeam: hasPreference ? application.teamPreference : null,
    });
    await sendMail({ to: intern.email, subject, html });

    return res.json(stripPassword(updated));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

// Body: { rejectionReason: string (required), rejectedField?: "cv" | "photo" | "agreement" | "internshipRequest" }
// When rejectedField is given, the matching per-document status/reason on
// Application (e.g. cvStatus/cvRejectionReason) is set too, in addition to
// the application's overall status/rejectionReason.
async function rejectApplication(req, res) {
  try {
    const id = Number(req.params.id);
    const { rejectionReason, rejectedField } = req.body;
    if (!rejectionReason) {
      return res.status(400).json({ message: "rejectionReason is required." });
    }
    if (rejectedField && !REJECTABLE_FIELDS[rejectedField]) {
      return res.status(400).json({
        message: `rejectedField must be one of: ${Object.keys(REJECTABLE_FIELDS).join(", ")}`,
      });
    }

    const application = await prisma.application.findUnique({ where: { id } });
    if (!application)
      return res.status(404).json({ message: "Application not found." });

    const data = {
      status: "Rejected",
      reviewedAt: new Date(),
      rejectionReason,
      rawPassword: null, // no longer needed — this application won't become an account
    };
    let rejectedFieldLabel = null;
    if (rejectedField) {
      const { statusField, reasonField, label } =
        REJECTABLE_FIELDS[rejectedField];
      data[statusField] = "Rejected";
      data[reasonField] = rejectionReason;
      rejectedFieldLabel = label;
    }

    const updated = await prisma.application.update({ where: { id }, data });

    const { subject, html } = applicationRejectedEmail({
      firstName: updated.firstName,
      reason: rejectionReason,
      rejectedField: rejectedFieldLabel,
    });
    await sendMail({ to: updated.email, subject, html });

    return res.json(stripPassword(updated));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

// Body: { field: "cv" | "photo" | "agreement" | "internshipRequest" }
// Approves ONE document on an application without deciding the whole
// application — the admin can accept the CV today and the photo tomorrow,
// then make the final accept/reject call once everything's been reviewed.
// Does not touch application.status; the final decision still goes through
// acceptApplication/rejectApplication above.
async function approveApplicationDocument(req, res) {
  try {
    const id = Number(req.params.id);
    const { field } = req.body;
    if (!field || !REJECTABLE_FIELDS[field]) {
      return res.status(400).json({
        message: `field must be one of: ${Object.keys(REJECTABLE_FIELDS).join(", ")}`,
      });
    }

    const application = await prisma.application.findUnique({ where: { id } });
    if (!application)
      return res.status(404).json({ message: "Application not found." });

    const { statusField, reasonField } = REJECTABLE_FIELDS[field];
    const updated = await prisma.application.update({
      where: { id },
      data: { [statusField]: "Approved", [reasonField]: null },
    });

    return res.json(stripPassword(updated));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

// Public: the applicant cancels their own still-pending application —
// there's no account to log into yet for a Pending application, so this
// can't be behind requireAuth like everything else in this controller.
// Instead the applicant proves it's theirs with the email AND the password
// they chose when applying (application.password, a bcrypt hash), so
// knowing someone's email alone is no longer enough to cancel it.
async function cancelOwnApplication(req, res) {
  try {
    const email = (req.body.email || "").trim();
    const { password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const application = await prisma.application.findFirst({
      where: { email, status: "Pending" },
    });
    // Same answer for "no pending application" and "wrong password", so the
    // form can't be used to find out which emails have applied.
    const matches = application && (await bcrypt.compare(password, application.password));
    if (!matches) {
      return res
        .status(401)
        .json({ message: "Email or password is incorrect, or there is no pending application for this email." });
    }

    const updated = await prisma.application.update({
      where: { id: application.id },
      data: { status: "Cancelled", reviewedAt: new Date(), rawPassword: null },
    });

    const { subject, html } = cancelledByInternEmail({ firstName: updated.firstName, stage: "application" });
    await sendMail({ to: updated.email, subject, html });

    return res.json(stripPassword(updated));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

// Admin: cancel a still-pending application on the candidate's behalf
// (e.g. they asked by phone/email to withdraw). Same "already reviewed"
// guard as accept/reject.
async function cancelApplicationAsAdmin(req, res) {
  try {
    const id = Number(req.params.id);
    const application = await prisma.application.findUnique({ where: { id } });
    if (!application)
      return res.status(404).json({ message: "Application not found." });
    if (application.status !== "Pending") {
      return res
        .status(400)
        .json({ message: "This application has already been reviewed." });
    }

    const updated = await prisma.application.update({
      where: { id },
      data: { status: "Cancelled", reviewedAt: new Date(), rawPassword: null },
    });

    const { subject, html } = cancelledByAdminEmail({ firstName: updated.firstName, stage: "application" });
    await sendMail({ to: updated.email, subject, html });

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
  approveApplicationDocument,
  cancelOwnApplication,
  cancelApplicationAsAdmin,
};
