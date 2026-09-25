const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const MOJIBAKE_PATTERN = /Ã./;

function fix(name) {
  if (typeof name !== "string" || !MOJIBAKE_PATTERN.test(name)) return name;
  const repaired = Buffer.from(name, "latin1").toString("utf8");
  return MOJIBAKE_PATTERN.test(repaired) ? name : repaired;
}

async function main() {
  let changed = 0;

  console.log("Checking Application file names...");
  const applications = await prisma.application.findMany({
    select: {
      id: true,
      cvFileName: true,
      photoFileName: true,
      agreementFileName: true,
      internshipRequestFileName: true,
      otherDocuments: true,
    },
  });
  for (const app of applications) {
    const data = {};
    const cv = fix(app.cvFileName);
    const photo = fix(app.photoFileName);
    const agreement = fix(app.agreementFileName);
    const internshipRequest = fix(app.internshipRequestFileName);
    if (cv !== app.cvFileName) data.cvFileName = cv;
    if (photo !== app.photoFileName) data.photoFileName = photo;
    if (agreement !== app.agreementFileName) data.agreementFileName = agreement;
    if (internshipRequest !== app.internshipRequestFileName)
      data.internshipRequestFileName = internshipRequest;

    let otherDocuments;
    if (Array.isArray(app.otherDocuments)) {
      let otherChanged = false;
      otherDocuments = app.otherDocuments.map((doc) => {
        const label = fix(doc.label);
        const fileName = fix(doc.fileName);
        if (label !== doc.label || fileName !== doc.fileName)
          otherChanged = true;
        return { ...doc, label, fileName };
      });
      if (otherChanged) data.otherDocuments = otherDocuments;
    }

    if (Object.keys(data).length > 0) {
      await prisma.application.update({ where: { id: app.id }, data });
      changed++;
      console.log(`  Fixed application #${app.id}`);
    }
  }

  console.log("Checking Submission file names...");
  const submissions = await prisma.submission.findMany({
    select: { id: true, fileName: true },
  });
  for (const sub of submissions) {
    const fileName = fix(sub.fileName);
    if (fileName !== sub.fileName) {
      await prisma.submission.update({
        where: { id: sub.id },
        data: { fileName },
      });
      changed++;
      console.log(`  Fixed submission #${sub.id}`);
    }
  }

  console.log("Checking Document file names...");
  const documents = await prisma.document.findMany({
    select: { id: true, fileName: true },
  });
  for (const doc of documents) {
    const fileName = fix(doc.fileName);
    if (fileName !== doc.fileName) {
      await prisma.document.update({
        where: { id: doc.id },
        data: { fileName },
      });
      changed++;
      console.log(`  Fixed document #${doc.id}`);
    }
  }

  console.log(`\nDone. Fixed ${changed} record(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
