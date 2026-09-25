// Plain, self-contained HTML email bodies. Kept deliberately simple
// (inline styling only, no external assets) since Mailtrap/most inboxes
// render this reliably without any build step.

function welcomeUserEmail({ firstName, email, temporaryPassword, role }) {
  return {
    subject: 'Welcome to the Internship Management Portal',
    html: `
      <p>Hi ${firstName},</p>
      <p>An account has been created for you on the Internship Management Portal.</p>
      <ul>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Temporary password:</strong> ${temporaryPassword}</li>
        <li><strong>Role:</strong> ${role}</li>
      </ul>
      <p>Please log in and change your password as soon as possible.</p>
    `,
  };
}

// Same cases as the in-app notification (see applicationsController#
// acceptApplication): placed in the preferred team, placed in a different
// one than preferred, or no preference stated. `preferredTeam` is null
// when the applicant chose "No preference"; `teamName` is "To be assigned"
// when no team was set yet.
function teamPreferenceLine({ teamName, preferredTeam, hasTeam }) {
  if (!preferredTeam) {
    return hasTeam ? '<p>You did not choose a preferred team, so you have been placed in the team above.</p>' : '';
  }
  if (!hasTeam) {
    return `<p>Your preferred team was <strong>${preferredTeam}</strong>. Your team has not been assigned yet.</p>`;
  }
  if (teamName === preferredTeam) {
    return `<p>Good news: you have been placed in <strong>your preferred team</strong> (${preferredTeam}).</p>`;
  }
  return `<p>Your preferred team was <strong>${preferredTeam}</strong>, but you have been placed in <strong>${teamName}</strong> instead, based on the teams' current needs.</p>`;
}

function applicationAcceptedEmail({ firstName, email, password, teamName, preferredTeam = null }) {
  const hasTeam = teamName !== 'To be assigned';
  return {
    subject: 'Congratulations — your application has been accepted!',
    html: `
      <p>Hi ${firstName},</p>
      <p>Congratulations, your internship application has been <strong>accepted</strong>.</p>
      <p>Your account has been created — log in with the same email and password you used when applying:</p>
      <ul>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Password:</strong> ${password}</li>
        <li><strong>Team:</strong> ${teamName}</li>
        ${preferredTeam ? `<li><strong>Preferred team:</strong> ${preferredTeam}</li>` : ''}
      </ul>
      ${teamPreferenceLine({ teamName, preferredTeam, hasTeam })}
    `,
  };
}

function applicationRejectedEmail({ firstName, reason, rejectedField }) {
  return {
    subject: 'Update on your internship application',
    html: `
      <p>Hi ${firstName},</p>
      <p>We're sorry to inform you that your internship application was not accepted.</p>
      ${rejectedField ? `<p><strong>Issue with:</strong> ${rejectedField}</p>` : ''}
      <p><strong>Reason:</strong> ${reason}</p>
    `,
  };
}

function assignmentDeadlineEmail({ firstName, title, deadline, isOverdue }) {
  const dateStr = new Date(deadline).toLocaleDateString();
  return {
    subject: isOverdue ? `Overdue: "${title}"` : `Reminder: "${title}" is due soon`,
    html: `
      <p>Hi ${firstName},</p>
      <p>${
        isOverdue
          ? `Your assignment "<strong>${title}</strong>" was due on <strong>${dateStr}</strong> and has not been submitted yet.`
          : `Your assignment "<strong>${title}</strong>" is due on <strong>${dateStr}</strong>.`
      }</p>
      <p>Please log in to the portal to submit your work.</p>
    `,
  };
}

function documentRequestDeadlineEmail({ firstName, title, deadline, isOverdue }) {
  const dateStr = new Date(deadline).toLocaleDateString();
  return {
    subject: isOverdue ? `Overdue document request: "${title}"` : `Reminder: document "${title}" is due soon`,
    html: `
      <p>Hi ${firstName},</p>
      <p>${
        isOverdue
          ? `The document request "<strong>${title}</strong>" was due on <strong>${dateStr}</strong> and hasn't been submitted yet.`
          : `The document request "<strong>${title}</strong>" is due on <strong>${dateStr}</strong>.`
      }</p>
      <p>Please log in to the portal to upload the requested document.</p>
    `,
  };
}

function forgotPasswordEmail({ firstName, resetUrl }) {
  return {
    subject: 'Reset your password',
    html: `
      <p>Hi ${firstName},</p>
      <p>We received a request to reset your Internship Management Portal password. Click the link below to choose a new one:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.</p>
    `,
  };
}

module.exports = {
  welcomeUserEmail,
  applicationAcceptedEmail,
  applicationRejectedEmail,
  assignmentDeadlineEmail,
  documentRequestDeadlineEmail,
  forgotPasswordEmail,
};
