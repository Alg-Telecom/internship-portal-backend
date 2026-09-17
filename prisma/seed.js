/**
 * Prisma seed script — loads the exact same demo dataset the frontend's
 * mock API ships with (frontend/src/services/mockApi/seed.js) into the
 * real MySQL database, so the app has something to click through as soon
 * as the real backend is wired up.
 *
 * Run with: npm run prisma:seed   (defined in backend/package.json)
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Password123';

// Same relative-day-offset helper as the frontend seed, so dates stay
// "fresh" (relative to today) no matter when this script is run.
const today = new Date();
function offsetDate(offsetDays = 0) {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log('Clearing existing data...');
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

  console.log('Creating users...');
  const usersData = [
    {
      id: 1,
      role: 'admin',
      firstName: 'Sara',
      lastName: 'Laribi',
      email: 'admin@imp.dz',
      password: passwordHash,
      phoneNumber: '+213 555 10 10 10',
      createdAt: offsetDate(-200),
      isActive: true,
    },
    {
      id: 2,
      role: 'supervisor',
      firstName: 'Lamia',
      lastName: 'Belkaid',
      email: 'lamia.belkaid@imp.dz',
      password: passwordHash,
      phoneNumber: '+213 555 20 20 20',
      specialization: 'Network Engineering',
      department: 'Infrastructure',
      createdAt: offsetDate(-180),
      isActive: true,
    },
    {
      id: 3,
      role: 'supervisor',
      firstName: 'Wissam',
      lastName: 'Nekkache',
      email: 'wissam.nekkache@imp.dz',
      password: passwordHash,
      phoneNumber: '+213 555 30 30 30',
      specialization: 'Software Development',
      department: 'Digital Services',
      createdAt: offsetDate(-180),
      isActive: true,
    },
    {
      id: 4,
      role: 'intern',
      firstName: 'Mehdi',
      lastName: 'Laribi',
      email: 'mehdi.laribi@imp.dz',
      password: passwordHash,
      phoneNumber: '+213 555 40 40 01',
      studentId: 'USTHB-2025-041',
      university: 'USTHB',
      fieldOfStudy: 'Computer Science',
      academicLevel: "Master's, Year 2",
      registrationDate: offsetDate(-60),
      isActive: true,
      createdAt: offsetDate(-60),
    },
    {
      id: 5,
      role: 'intern',
      firstName: 'Kamel',
      lastName: 'Laribi',
      email: 'kamel.laribi@imp.dz',
      password: passwordHash,
      phoneNumber: '+213 555 40 40 02',
      studentId: 'ENSIA-2025-118',
      university: 'ENSIA',
      fieldOfStudy: 'Telecommunications',
      academicLevel: 'Engineering, Year 5',
      registrationDate: offsetDate(-58),
      isActive: true,
      createdAt: offsetDate(-58),
    },
    {
      id: 6,
      role: 'intern',
      firstName: 'Radia',
      lastName: 'Belkaid',
      email: 'radia.belkaid@imp.dz',
      password: passwordHash,
      phoneNumber: '+213 555 40 40 03',
      studentId: 'USTHB-2025-077',
      university: 'USTHB',
      fieldOfStudy: 'Software Engineering',
      academicLevel: "Master's, Year 1",
      registrationDate: offsetDate(-40),
      isActive: true,
      createdAt: offsetDate(-40),
    },
  ];
  // teamId is filled in after teams exist (see below) — avoids the
  // User <-> Team chicken-and-egg problem.
  for (const u of usersData) {
    await prisma.user.create({ data: u });
  }

  console.log('Creating teams...');
  const teamsData = [
    {
      id: 1,
      name: 'Network Infrastructure Team',
      nameFr: 'Équipe Infrastructure Réseau',
      nameAr: 'فريق البنية التحتية للشبكات',
      description: 'Interns working on network monitoring and infrastructure tooling.',
      startDate: offsetDate(-60),
      endDate: offsetDate(60),
      status: 'Active',
      supervisorId: 2,
    },
    {
      id: 2,
      name: 'Digital Services Team',
      nameFr: 'Équipe Services Numériques',
      nameAr: 'فريق الخدمات الرقمية',
      description: 'Interns building internal digital-service web applications.',
      startDate: offsetDate(-40),
      endDate: offsetDate(80),
      status: 'Active',
      supervisorId: 3,
    },
    {
      id: 3,
      name: 'Development and Innovation Department',
      nameFr: "Direction de Développement et d'Innovation",
      nameAr: 'إدارة التطوير والابتكار',
      description: 'Interns working on R&D initiatives and new internal tooling for Algerie Telecom.',
      startDate: offsetDate(0),
      endDate: offsetDate(120),
      status: 'Planned',
      supervisorId: null,
    },
  ];
  for (const t of teamsData) {
    await prisma.team.create({ data: t });
  }

  console.log('Assigning interns to teams...');
  await prisma.user.update({ where: { id: 4 }, data: { teamId: 1 } });
  await prisma.user.update({ where: { id: 5 }, data: { teamId: 1 } });
  await prisma.user.update({ where: { id: 6 }, data: { teamId: 2 } });

  console.log('Creating applications...');
  const applicationsData = [
    {
      id: 1,
      firstName: 'Mehdi',
      lastName: 'Laribi',
      personalId: 'ID-4471002',
      email: 'mehdi.laribi@imp.dz',
      phone: '+213 555 40 40 01',
      birthday: new Date('2001-03-12'),
      university: 'USTHB',
      major: 'Computer Science',
      grade: "Master's",
      teamPreference: 'Network Infrastructure Team',
      startDate: offsetDate(-60),
      endDate: offsetDate(60),
      password: passwordHash,
      cvFileName: 'mehdi_laribi_cv.pdf',
      photoFileName: 'mehdi_laribi_photo.jpg',
      agreementFileName: 'mehdi_laribi_agreement.pdf',
      internshipRequestFileName: 'mehdi_laribi_internship_request.pdf',
      otherDocuments: [],
      submissionDate: offsetDate(-65),
      status: 'Accepted',
      rejectionReason: '',
      reviewedAt: offsetDate(-62),
      internId: 4,
      cvStatus: 'Approved',
      photoStatus: 'Approved',
      agreementStatus: 'Approved',
      internshipRequestStatus: 'Approved',
    },
    {
      id: 2,
      firstName: 'Kamel',
      lastName: 'Laribi',
      personalId: 'ID-3382110',
      email: 'kamel.laribi@imp.dz',
      phone: '+213 555 40 40 02',
      birthday: new Date('2000-11-02'),
      university: 'ENSIA',
      major: 'Telecommunications',
      grade: 'Engineering',
      teamPreference: 'Network Infrastructure Team',
      startDate: offsetDate(-58),
      endDate: offsetDate(62),
      password: passwordHash,
      cvFileName: 'kamel_laribi_cv.pdf',
      photoFileName: 'kamel_laribi_photo.jpg',
      agreementFileName: 'kamel_laribi_agreement.pdf',
      internshipRequestFileName: 'kamel_laribi_internship_request.pdf',
      otherDocuments: [],
      submissionDate: offsetDate(-63),
      status: 'Accepted',
      rejectionReason: '',
      reviewedAt: offsetDate(-60),
      internId: 5,
      cvStatus: 'Approved',
      photoStatus: 'Approved',
      agreementStatus: 'Approved',
      internshipRequestStatus: 'Approved',
    },
    {
      id: 3,
      firstName: 'Radia',
      lastName: 'Belkaid',
      personalId: 'ID-5501987',
      email: 'radia.belkaid@imp.dz',
      phone: '+213 555 40 40 03',
      birthday: new Date('2002-05-21'),
      university: 'USTHB',
      major: 'Software Engineering',
      grade: "Master's",
      teamPreference: 'Digital Services Team',
      startDate: offsetDate(-40),
      endDate: offsetDate(80),
      password: passwordHash,
      cvFileName: 'radia_belkaid_cv.pdf',
      photoFileName: 'radia_belkaid_photo.jpg',
      agreementFileName: 'radia_belkaid_agreement.pdf',
      internshipRequestFileName: 'radia_belkaid_internship_request.pdf',
      otherDocuments: [],
      submissionDate: offsetDate(-45),
      status: 'Accepted',
      rejectionReason: '',
      reviewedAt: offsetDate(-42),
      internId: 6,
      cvStatus: 'Approved',
      photoStatus: 'Approved',
      agreementStatus: 'Approved',
      internshipRequestStatus: 'Approved',
    },
    {
      id: 4,
      firstName: 'Ikram',
      lastName: 'Nekkache',
      personalId: 'ID-9903211',
      email: 'ikram.nekkache@example.com',
      phone: '+213 555 40 40 04',
      birthday: new Date('2001-08-09'),
      university: 'ESI Alger',
      major: 'Computer Science',
      grade: 'Engineering',
      teamPreference: 'Digital Services Team',
      startDate: offsetDate(10),
      endDate: offsetDate(100),
      password: passwordHash,
      cvFileName: 'ikram_nekkache_cv.pdf',
      photoFileName: 'ikram_nekkache_photo.jpg',
      agreementFileName: 'ikram_nekkache_agreement.pdf',
      internshipRequestFileName: 'ikram_nekkache_internship_request.pdf',
      otherDocuments: [],
      submissionDate: offsetDate(-3),
      status: 'Pending',
      rejectionReason: '',
      reviewedAt: null,
      internId: null,
      cvStatus: 'Pending',
      photoStatus: 'Pending',
      agreementStatus: 'Pending',
      internshipRequestStatus: 'Pending',
    },
    {
      id: 5,
      firstName: 'Amel',
      lastName: 'Belkaid',
      personalId: 'ID-1120456',
      email: 'amel.belkaid@example.com',
      phone: '+213 555 40 40 05',
      birthday: new Date('2003-01-30'),
      university: 'Universite Bejaia',
      major: 'Information Systems',
      grade: "Bachelor's",
      teamPreference: 'Network Infrastructure Team',
      startDate: offsetDate(15),
      endDate: offsetDate(105),
      password: passwordHash,
      cvFileName: 'amel_belkaid_cv.pdf',
      photoFileName: 'amel_belkaid_photo.jpg',
      agreementFileName: 'amel_belkaid_agreement.pdf',
      internshipRequestFileName: 'amel_belkaid_internship_request.pdf',
      otherDocuments: [{ label: 'Motivation letter', fileName: 'amel_belkaid_motivation_letter.pdf', fileUrl: '' }],
      submissionDate: offsetDate(-1),
      status: 'Pending',
      rejectionReason: '',
      reviewedAt: null,
      internId: null,
      cvStatus: 'Pending',
      photoStatus: 'Pending',
      agreementStatus: 'Pending',
      internshipRequestStatus: 'Pending',
    },
  ];
  for (const a of applicationsData) {
    await prisma.application.create({ data: a });
  }

  console.log('Creating assignments...');
  const assignmentsData = [
    {
      id: 1,
      teamId: 1,
      supervisorId: 2,
      internId: 4,
      title: 'Network topology audit',
      description: 'Document the current LAN/WAN topology for the Algiers regional site and flag redundancy gaps.',
      creationDate: offsetDate(-30),
      deadline: offsetDate(-10),
      status: 'Evaluated',
      priority: 'High',
    },
    {
      id: 2,
      teamId: 1,
      supervisorId: 2,
      internId: 4,
      title: 'Monitoring dashboard proposal',
      description: 'Propose a monitoring dashboard layout for uptime/latency KPIs across core routers.',
      creationDate: offsetDate(-14),
      deadline: offsetDate(3),
      status: 'Submitted',
      priority: 'Medium',
    },
    {
      id: 3,
      teamId: 1,
      supervisorId: 2,
      internId: 5,
      title: 'VLAN segmentation report',
      description: 'Analyze current VLAN segmentation and recommend improvements for the branch office rollout.',
      creationDate: offsetDate(-20),
      deadline: offsetDate(-2),
      status: 'Late',
      priority: 'High',
    },
    {
      id: 4,
      teamId: 1,
      supervisorId: 2,
      internId: 5,
      title: 'Weekly status notes',
      description: 'Keep a running log of daily tasks and blockers for the sprint review.',
      creationDate: offsetDate(-5),
      deadline: offsetDate(9),
      status: 'Pending',
      priority: 'Low',
    },
    {
      id: 5,
      teamId: 2,
      supervisorId: 3,
      internId: 6,
      title: 'Internal ticketing UI mockups',
      description: 'Design 3 mockups for the internal IT ticketing portal home screen.',
      creationDate: offsetDate(-12),
      deadline: offsetDate(2),
      status: 'InProgress',
      priority: 'Medium',
    },
  ];
  for (const a of assignmentsData) {
    await prisma.assignment.create({ data: a });
  }

  console.log('Creating submissions...');
  const submissionsData = [
    {
      id: 1,
      assignmentId: 1,
      internId: 4,
      fileName: 'network_topology_audit.pdf',
      fileUrl: '',
      submissionDate: offsetDate(-11),
      version: 1,
      grade: 17,
      feedback: 'Thorough audit, clear diagrams. Add a short executive summary next time.',
      status: 'Accepted',
    },
    {
      id: 2,
      assignmentId: 2,
      internId: 4,
      fileName: 'monitoring_dashboard_proposal.pdf',
      fileUrl: '',
      submissionDate: offsetDate(-1),
      version: 1,
      grade: null,
      feedback: '',
      status: 'Submitted',
    },
  ];
  for (const s of submissionsData) {
    await prisma.submission.create({ data: s });
  }

  console.log('Creating attendance records...');
  const attendanceData = [
    ...[6, 5, 4, 3, 2, 1, 0].map((offset, i) => ({
      id: i + 1,
      internId: 4,
      supervisorId: 2,
      date: offsetDate(-offset),
      arrivalTime: offset === 3 ? null : '08:30',
      departureTime: offset === 3 ? null : '16:30',
      status: offset === 3 ? 'Absent' : offset === 5 ? 'Late' : 'Present',
      remarks: offset === 3 ? 'Medical appointment' : '',
    })),
    ...[4, 3, 2, 1, 0].map((offset, i) => ({
      id: 100 + i,
      internId: 5,
      supervisorId: 2,
      date: offsetDate(-offset),
      arrivalTime: '08:45',
      departureTime: '16:30',
      status: 'Present',
      remarks: '',
    })),
  ];
  for (const rec of attendanceData) {
    await prisma.attendance.create({ data: rec });
  }

  console.log('Creating document requests...');
  const documentRequestsData = [
    {
      id: 1,
      internId: 4,
      adminId: 1,
      title: 'Signed Internship Agreement',
      description: 'Please upload the internship agreement signed by your university and Algerie Telecom.',
      requestDate: offsetDate(-55),
      deadline: offsetDate(-45),
      status: 'Approved',
      rejectionReason: '',
    },
    {
      id: 2,
      internId: 5,
      adminId: 1,
      title: 'National ID copy',
      description: 'Upload a clear scan of your national identity document.',
      requestDate: offsetDate(-50),
      deadline: offsetDate(-40),
      status: 'Rejected',
      rejectionReason: 'Scan is blurry, please re-upload a clearer copy.',
    },
    {
      id: 3,
      internId: 6,
      adminId: 1,
      title: 'End-of-internship Report',
      description: 'Upload your final internship report (PDF, max 10MB).',
      requestDate: offsetDate(-3),
      deadline: offsetDate(20),
      status: 'Pending',
      rejectionReason: '',
    },
  ];
  for (const dr of documentRequestsData) {
    await prisma.documentRequest.create({ data: dr });
  }

  console.log('Creating documents...');
  const documentsData = [
    {
      id: 1,
      requestId: 1,
      internId: 4,
      fileName: 'internship_agreement_signed.pdf',
      fileUrl: '',
      documentType: 'InternshipAgreement',
      uploadDate: offsetDate(-48),
      version: 1,
      status: 'Approved',
      rejectionReason: '',
    },
    {
      id: 2,
      requestId: 2,
      internId: 5,
      fileName: 'id_card.jpg',
      fileUrl: '',
      documentType: 'IdentityDocument',
      uploadDate: offsetDate(-47),
      version: 1,
      status: 'Rejected',
      rejectionReason: 'Scan is blurry, please re-upload a clearer copy.',
    },
  ];
  for (const d of documentsData) {
    await prisma.document.create({ data: d });
  }

  console.log('Creating notifications...');
  // NOTE: the schema's Notification.titleKey/messageKey are meant to hold
  // i18n keys (resolved client-side), but this demo dataset only has
  // plain English text, same as the frontend's mock seed. We store the
  // literal text directly — good enough for demo data to click through;
  // real notifications created by the backend later should use actual
  // translation keys instead.
  const notificationsData = [
    {
      id: 1,
      userId: 1,
      titleKey: 'New internship application',
      messageKey: 'Ikram Nekkache submitted an internship application.',
      creationDate: offsetDate(-3),
      isRead: false,
      notificationType: 'Application',
      link: '/admin/applications/4',
    },
    {
      id: 2,
      userId: 1,
      titleKey: 'New internship application',
      messageKey: 'Amel Belkaid submitted an internship application.',
      creationDate: offsetDate(-1),
      isRead: false,
      notificationType: 'Application',
      link: '/admin/applications/5',
    },
    {
      id: 3,
      userId: 4,
      titleKey: 'Assignment graded',
      messageKey: 'Your submission for "Network topology audit" was graded: 17/20.',
      creationDate: offsetDate(-11),
      isRead: true,
      notificationType: 'Evaluation',
      link: '/intern/assignments/1',
    },
    {
      id: 4,
      userId: 5,
      titleKey: 'Document rejected',
      messageKey: 'Your "National ID copy" document was rejected. Please resubmit.',
      creationDate: offsetDate(-47),
      isRead: false,
      notificationType: 'Document',
      link: '/intern/documents',
    },
  ];
  for (const n of notificationsData) {
    await prisma.notification.create({ data: n });
  }

  console.log('Creating calendar events...');
  const calendarEventsData = [
    { id: 1, title: 'Network Infrastructure Team — Start', date: offsetDate(-60), type: 'start' },
    { id: 2, title: 'Network Infrastructure Team — End', date: offsetDate(60), type: 'end' },
    { id: 3, title: 'Digital Services Team — Start', date: offsetDate(-40), type: 'start' },
    { id: 4, title: 'Digital Services Team — End', date: offsetDate(80), type: 'end' },
    { id: 5, title: 'National Day (Public Holiday)', date: offsetDate(25), type: 'holiday' },
    { id: 6, title: 'Mid-internship review meeting', date: offsetDate(15), type: 'event' },
  ];
  for (const ev of calendarEventsData) {
    await prisma.calendarEvent.create({ data: ev });
  }

  console.log('\nDone. Every demo account uses the password: ' + DEMO_PASSWORD);
  console.log('e.g. admin@imp.dz / lamia.belkaid@imp.dz / mehdi.laribi@imp.dz ...');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
