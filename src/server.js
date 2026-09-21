const express = require("express");
const cors = require("cors");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const path = require("path");
const cron = require("node-cron");
const authRoutes = require("./routes/authRoutes");
const usersRoutes = require("./routes/usersRoutes");
const teamsRoutes = require("./routes/teamsRoutes");
const notificationsRoutes = require("./routes/notificationsRoutes");
const applicationsRoutes = require("./routes/applicationsRoutes");
const assignmentsRoutes = require("./routes/assignmentsRoutes");
const submissionsRoutes = require("./routes/submissionsRoutes");
const documentRequestsRoutes = require("./routes/documentRequestsRoutes");
const documentsRoutes = require("./routes/documentsRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const calendarEventsRoutes = require("./routes/calendarEventsRoutes");
const pool = require("./config/db");
const { runDeadlineCheck } = require("./utils/deadlineReminders");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/teams", teamsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/assignments", assignmentsRoutes);
app.use("/api/submissions", submissionsRoutes);
app.use("/api/document-requests", documentRequestsRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/calendar-events", calendarEventsRoutes);

app.get("/", (req, res) => {
  res.send("Internship Management Portal API is running!");
});

app.get("/api/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS result");
    res.json({ message: "Database connected successfully!", data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Database connection failed" });
  }
});

// Daily deadline-reminder check (assignments + document requests), every
// day at 08:00 server time. Emails interns whose deadline is overdue or
// within the next couple of days, and flips overdue assignments to "Late".
/*
cron.schedule("0 8 * * *", () => {
  runDeadlineCheck().catch((err) =>
    console.error("[deadline-check] failed:", err),
  );
});
*/

// Must come after every route above: catches unmatched routes, then any
// error that slipped past a controller's own try/catch.
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
