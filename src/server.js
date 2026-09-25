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
const {
  runDeadlineCheck,
  markOverdueItems,
} = require("./utils/deadlineReminders");
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
// day at 08:00 server time. Emails interns whose deadline is due tomorrow
// or became overdue yesterday, and flips overdue assignments to "Late".
cron.schedule("0 8 * * *", () => {
  runDeadlineCheck().catch((err) =>
    console.error("[deadline-check] failed:", err),
  );
});

// Hourly, so an assignment/document request whose deadline passed shows as
// "Late" soon after midnight instead of waiting for the 08:00 run. Only
// updates statuses — reminder emails stay on the daily schedule above.
cron.schedule("5 * * * *", () => {
  markOverdueItems().catch((err) =>
    console.error("[deadline-check] marking overdue failed:", err),
  );
});

// Must come after every route above: catches unmatched routes, then any
// error that slipped past a controller's own try/catch.
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  // Safe to run on every restart: each reminder is logged in ReminderLog
  // and never sent twice (see utils/deadlineReminders.js).
  // Also run once right when the server starts, on top of the daily 08:00
  // schedule above. node-cron only fires while the process is actually
  // running at that exact minute — it doesn't "catch up" on a check it
  // missed because the server was off at 8am — so without this, testing
  // the reminder emails during development means either waiting for 8am
  // or leaving the server running overnight. This makes every restart
  // double as a check.
  runDeadlineCheck().catch((err) =>
    console.error("[deadline-check] failed:", err),
  );
});
