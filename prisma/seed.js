/**
 * Prisma seed script — resets the database to a clean starting state:
 * just the admin account and the two supervisor accounts, plus the two
 * teams they'll supervise. No interns, applications, assignments,
 * attendance, documents, notifications, or calendar events — those are
 * all meant to come from real usage of the app (interns apply through
 * /apply, the admin accepts them, etc.).
 *
 * Run with: npm run prisma:seed   (defined in backend/package.json)
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Password123";

// Same relative-day-offset helper as before, so dates stay "fresh"
// (relative to today) no matter when this script is run.
const today = new Date();
function offsetDate(offsetDays = 0) {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log("Clearing existing data...");
  // Children first, respecting foreign keys.
  await prisma.notification.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.document.deleteMany();
  await prisma.documentRequest.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.application.deleteMany();
  // Teams reference users (supervisorId) and users reference teams
  // (teamId) — break the cycle by nulling teamId before deleting either.
  await prisma.user.updateMany({ data: { teamId: null } });
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();

  console.log("Creating users (admin + 2 supervisors only)...");
  const usersData = [
    {
      id: 1,
      role: "admin",
      firstName: "Sara",
      lastName: "Laribi",
      email: "imp.algerie.telecom@gmail.com",
      password: passwordHash,
      phoneNumber: "+213 555 10 10 10",
      createdAt: offsetDate(0),
      isActive: true,
    },
    {
      id: 2,
      role: "supervisor",
      firstName: "Lamia",
      lastName: "Belkaid",
      email: "ms.laribi@gmail.com",
      password: passwordHash,
      phoneNumber: "+213 555 20 20 20",
      specialization: "Network Engineering",
      department: "Infrastructure",
      createdAt: offsetDate(0),
      isActive: true,
    },
    {
      id: 3,
      role: "supervisor",
      firstName: "Mehdi",
      lastName: "Laribi",
      email: "ms_laribi@esi.dz",
      password: passwordHash,
      phoneNumber: "+213 555 30 30 30",
      specialization: "Software Development",
      department: "Digital Services",
      createdAt: offsetDate(0),
      isActive: true,
    },
  ];
  for (const u of usersData) {
    await prisma.user.create({ data: u });
  }

  console.log("Creating teams...");
  const teamsData = [
    {
      id: 1,
      name: "Network and Infrastructure Team",
      nameFr: "Équipe Réseau et Infrastructure",
      nameAr: "فريق الشبكات والبنية التحتية",
      description:
        "Interns working on network monitoring and infrastructure tooling.",
      startDate: offsetDate(0),
      endDate: offsetDate(180),
      status: "Active",
      supervisorId: 2,
    },
    {
      id: 2,
      name: "Development and Innovation of IT Systems",
      nameFr: "Développement et Innovation des Systèmes Informatiques",
      nameAr: "تطوير وابتكار الأنظمة المعلوماتية",
      description:
        "Interns building and improving internal IT systems and digital services.",
      startDate: offsetDate(0),
      endDate: offsetDate(180),
      status: "Active",
      supervisorId: 3,
    },
  ];
  for (const t of teamsData) {
    await prisma.team.create({ data: t });
  }

  console.log(
    "\nDone. Created 1 admin + 2 supervisors and 2 teams. Everything else " +
      "(interns, applications, assignments, attendance, documents, " +
      "notifications, calendar events) is intentionally left empty — " +
      "interns should come in through the real /apply flow, then be " +
      "accepted by the admin.",
  );
  console.log("Every account uses the password: " + DEMO_PASSWORD);
  console.log("Admin: imp.algerie.telecom@gmail.com");
  console.log("Supervisor (Lamia Belkaid): ms.laribi@gmail.com");
  console.log("Supervisor (Mehdi Laribi): ms_laribi@esi.dz");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
