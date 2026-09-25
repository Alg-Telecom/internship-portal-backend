/**
 * One-off repair script: fixes notifications that were created BEFORE two
 * bugs in applicationsController.js got fixed, so they permanently show
 * the raw i18n key or a literal, unsubstituted "{name}" instead of real
 * text — those rows were already saved wrong and the fix to the
 * controller only changes what NEW notifications look like.
 *
 * 1) "New internship application" notifications stored { firstName,
 *    lastName } as params, but the translation string needs a single
 *    {name} — so it showed up literally as "{name} submitted...".
 * 2) "Application accepted" notifications stored a messageKey that never
 *    existed in translations.js ("...applicationAccepted.message"), so
 *    the raw key showed up instead of real text. This re-derives which
 *    variant (default/preferred/assigned/overridden) it should have used
 *    from the intern's current team + their original stated preference.
 *
 * Safe to run more than once — every notification it touches ends up in
 * the same correct shape either way.
 *
 * Run with: node src/scripts/fixNotificationMessages.js   (from the
 * backend/ folder, next to package.json, so it can find node_modules and
 * your .env)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  let fixed = 0;

  console.log('Checking "new application" notifications...');
  const newAppNotifications = await prisma.notification.findMany({
    where: { messageKey: 'notifications.newApplication.message' },
  });
  for (const n of newAppNotifications) {
    const p = n.params || {};
    if (!p.name && (p.firstName || p.lastName)) {
      const name = [p.firstName, p.lastName].filter(Boolean).join(' ');
      await prisma.notification.update({ where: { id: n.id }, data: { params: { name } } });
      fixed++;
      console.log(`  Fixed notification #${n.id} (newApplication) -> name: "${name}"`);
    }
  }

  console.log('Checking "application accepted" notifications...');
  const acceptedNotifications = await prisma.notification.findMany({
    where: { messageKey: 'notifications.applicationAccepted.message' },
  });
  for (const n of acceptedNotifications) {
    const user = await prisma.user.findUnique({ where: { id: n.userId } });
    const application = await prisma.application.findFirst({ where: { internId: n.userId } });
    const team = user?.teamId ? await prisma.team.findUnique({ where: { id: user.teamId } }) : null;
    const hasPreference = application?.teamPreference && application.teamPreference !== 'No preference';

    let messageKey = 'notifications.applicationAccepted.messageDefault';
    const params = {};
    if (team && hasPreference && team.name === application.teamPreference) {
      messageKey = 'notifications.applicationAccepted.messagePreferred';
      params.team = team.name;
    } else if (team && hasPreference) {
      messageKey = 'notifications.applicationAccepted.messageOverridden';
      params.team = team.name;
      params.preferredTeam = application.teamPreference;
    } else if (team) {
      messageKey = 'notifications.applicationAccepted.messageAssigned';
      params.team = team.name;
    }

    await prisma.notification.update({ where: { id: n.id }, data: { messageKey, params } });
    fixed++;
    console.log(`  Fixed notification #${n.id} (applicationAccepted) -> ${messageKey}`);
  }

  console.log(`\nDone. Fixed ${fixed} notification(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
