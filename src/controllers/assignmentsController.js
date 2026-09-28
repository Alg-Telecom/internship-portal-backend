const prisma = require("../config/prisma");
const { createNotification } = require("../utils/notifications");
const { resolveUpload, discardUpload } = require("../utils/uploadTypes");

function scopeWhere(req, where = {}) {
  // Non-admins only ever see their own assignments — an intern's or a
  // supervisor's own id always wins over whatever filter they passed in.
  if (req.user.role === "intern") return { ...where, internId: req.user.id };
  if (req.user.role === "supervisor")
    return { ...where, supervisorId: req.user.id };
  return where;
}

async function listAssignments(req, res) {
  try {
    const { teamId, internId, supervisorId, status } = req.query;
    let where = {};
    if (teamId) where.teamId = Number(teamId);
    if (internId) where.internId = Number(internId);
    if (supervisorId) where.supervisorId = Number(supervisorId);
    if (status) where.status = status;
    where = scopeWhere(req, where);

    const assignments = await prisma.assignment.findMany({
      where,
      include: { submissions: true },
      orderBy: { deadline: "asc" },
    });
    return res.json(assignments);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

async function getAssignment(req, res) {
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: Number(req.params.id) },
      include: { submissions: true },
    });
    if (!assignment)
      return res.status(404).json({ message: "Assignment not found." });

    if (req.user.role === "intern" && assignment.internId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You do not have permission to do this." });
    }
    if (
      req.user.role === "supervisor" &&
      assignment.supervisorId !== req.user.id
    ) {
      return res
        .status(403)
        .json({ message: "You do not have permission to do this." });
    }

    return res.json(assignment);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

async function createAssignment(req, res) {
  try {
    const { teamId, internId, title, description, deadline, priority } =
      req.body;
    if (!teamId || !internId || !title || !description || !deadline) {
      return res
        .status(400)
        .json({
          message:
            "teamId, internId, title, description and deadline are required.",
        });
    }

    // A supervisor creating an assignment is always its supervisor; only
    // an admin can assign work on a supervisor's behalf via supervisorId.
    const supervisorId =
      req.user.role === "supervisor"
        ? req.user.id
        : Number(req.body.supervisorId);
    if (!supervisorId) {
      return res.status(400).json({ message: "supervisorId is required." });
    }

    const assignment = await prisma.assignment.create({
      data: {
        teamId: Number(teamId),
        supervisorId,
        internId: Number(internId),
        title,
        description,
        deadline: new Date(deadline),
        priority: priority || "Medium",
      },
    });

    await createNotification({
      userId: assignment.internId,
      titleKey: "notifications.newAssignment.title",
      messageKey: "notifications.newAssignment.message",
      params: { title: assignment.title },
      notificationType: "Assignment",
      link: `/intern/assignments/${assignment.id}`,
    });

    return res.status(201).json(assignment);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

async function updateAssignment(req, res) {
  try {
    const id = Number(req.params.id);
    const assignment = await prisma.assignment.findUnique({ where: { id } });
    if (!assignment)
      return res.status(404).json({ message: "Assignment not found." });
    if (
      req.user.role === "supervisor" &&
      assignment.supervisorId !== req.user.id
    ) {
      return res
        .status(403)
        .json({ message: "You do not have permission to do this." });
    }

    const { deadline, ...rest } = req.body;
    const data = { ...rest };
    if (deadline) {
      data.deadline = new Date(deadline);
      // Moving a Late assignment's deadline to today or later makes it open
      // again (the hourly job only ever flips things TO Late).
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (
        assignment.status === "Late" &&
        !data.status &&
        data.deadline >= today
      )
        data.status = "Pending";
    }

    const updated = await prisma.assignment.update({ where: { id }, data });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

// Intern submits their work for an assignment, as one of three types
// (req.body.uploadType): a single File, a compressed folder (Archive)
// — both via multer's upload.single('file') — or a Link (req.body.link,
// e.g. a GitHub repo or a shared doc). Plus optional notes.
async function submitWork(req, res) {
  const file = req.file;
  try {
    const assignmentId = Number(req.params.id);
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) {
      discardUpload(file);
      return res.status(404).json({ message: "Assignment not found." });
    }
    if (assignment.internId !== req.user.id) {
      discardUpload(file);
      return res
        .status(403)
        .json({ message: "You do not have permission to do this." });
    }

    const upload = resolveUpload(req);
    if (upload.error) return res.status(400).json({ message: upload.error });

    const submission = await prisma.submission.create({
      data: {
        assignmentId,
        internId: req.user.id,
        submissionType: upload.uploadType,
        fileName: upload.fileName,
        fileUrl: upload.fileUrl,
        notes: req.body.notes || "",
        status: "Submitted",
      },
    });

    await prisma.assignment.update({
      where: { id: assignmentId },
      data: { status: "Submitted" },
    });

    await createNotification({
      userId: assignment.supervisorId,
      titleKey: "notifications.assignmentSubmitted.title",
      messageKey: "notifications.assignmentSubmitted.message",
      params: { title: assignment.title },
      notificationType: "Assignment",
      link: `/supervisor/assignments/${assignment.id}`,
    });

    return res.status(201).json(submission);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}

module.exports = {
  listAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  submitWork,
};
