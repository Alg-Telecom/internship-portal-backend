// Plain, self-contained HTML email bodies. Kept deliberately simple
// (inline styling only, no external assets) since Mailtrap/most inboxes
// render this reliably without any build step.

// Readable role name + one line on what that role does in the portal.
const ROLE_INFO = {
  admin: {
    label: 'Administrator',
    description: 'As an administrator, you manage applications, users, teams and document requests.',
  },
  supervisor: {
    label: 'Supervisor',
    description: "As a supervisor, you follow your team's interns: you create and grade assignments and record attendance.",
  },
  intern: {
    label: 'Intern',
    description: 'As an intern, you can see your assignments and submit your work, upload requested documents and follow your attendance.',
  },
};

function welcomeUserEmail({ firstName, email, temporaryPassword, role, teamName = null }) {
  const info = ROLE_INFO[role] || { label: role, description: '' };
  return {
    subject: `Welcome to the Internship Management Portal — your ${info.label} account`,
    html: `
      <p>Hi ${firstName},</p>
      <p>An account has been created for you on the Internship Management Portal with the role <strong>${info.label}</strong>.</p>
      ${info.description ? `<p>${info.description}</p>` : ''}
      <ul>
        <li><strong>Role:</strong> ${info.label}</li>
        ${role === 'intern' ? `<li><strong>Team:</strong> ${teamName || 'To be assigned'}</li>` : ''}
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Temporary password:</strong> ${temporaryPassword}</li>
      </ul>
      <p>Please log in and change your password as soon as possible.</p>
    `,
  };
}

// Same cases as the in-app notification (see applicationsController#
// acceptApplication): assigned to the preferred team, assigned to a team
// other than the preferred one, or no preference stated. `preferredTeam`
// is null when the applicant chose "No preference"; `teamName` is
// "To be assigned" when no team was set yet.
function teamAssignment({ teamName, preferredTeam }) {
  const hasTeam = teamName !== 'To be assigned';
  if (!hasTeam) {
    return {
      tag: '',
      line: preferredTeam
        ? `<p>Your preferred team was <strong>${preferredTeam}</strong>. You have not been assigned to a team yet.</p>`
        : '',
    };
  }
  if (!preferredTeam) {
    return { tag: '', line: `<p>You did not choose a preferred team. You have been assigned to <strong>${teamName}</strong>.</p>` };
  }
  if (teamName === preferredTeam) {
    return {
      tag: ' (your preferred team)',
      line: `<p>✅ <strong>You have been assigned to your preferred team</strong>: ${teamName}.</p>`,
    };
  }
  return {
    tag: ' (not your preferred team)',
    line: `<p>ℹ️ <strong>You have been assigned to a team other than your preferred one.</strong> You chose <strong>${preferredTeam}</strong>, and you have been assigned to <strong>${teamName}</strong>, based on the teams' current needs.</p>`,
  };
}

function applicationAcceptedEmail({ firstName, email, password, teamName, preferredTeam = null }) {
  const { tag, line } = teamAssignment({ teamName, preferredTeam });
  return {
    subject: 'Congratulations — your application has been accepted!',
    html: `
      <p>Hi ${firstName},</p>
      <p>Congratulations, your internship application has been <strong>accepted</strong>.</p>
      ${line}
      <p>Your account has been created — log in with the same email and password you used when applying:</p>
      <ul>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Password:</strong> ${password}</li>
        <li><strong>Team:</strong> ${teamName}${tag}</li>
        ${preferredTeam ? `<li><strong>Preferred team:</strong> ${preferredTeam}</li>` : ''}
      </ul>
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

// Cancellation emails. `stage` says what was cancelled:
//  - 'application': a still-pending application (no account exists yet)
//  - 'internship':  an accepted intern's internship — their account was
//                   deactivated or deleted, so they can no longer log in.

// The intern/applicant cancelled it themselves — a confirmation.
function cancelledByInternEmail({ firstName, stage }) {
  const isInternship = stage === 'internship';
  return {
    subject: isInternship ? 'Your internship withdrawal is confirmed' : 'Your application has been cancelled',
    html: `
      <p>Hi ${firstName},</p>
      <p>${
        isInternship
          ? 'This email confirms that you have <strong>withdrawn from your internship</strong>. Your account has been deactivated, so you can no longer log in to the portal.'
          : 'This email confirms that you have <strong>cancelled your internship application</strong>. It will not be reviewed.'
      }</p>
      <p>${
        isInternship
          ? 'If you did not request this, or if you change your mind, please contact the internship administration.'
          : 'If you did not request this, please contact the internship administration. You are welcome to submit a new application at any time.'
      }</p>
    `,
  };
}

// An admin cancelled it on the intern's/applicant's behalf.
function cancelledByAdminEmail({ firstName, stage }) {
  const isInternship = stage === 'internship';
  return {
    subject: isInternship ? 'Your internship has been cancelled' : 'Your internship application has been cancelled',
    html: `
      <p>Hi ${firstName},</p>
      <p>${
        isInternship
          ? 'We are writing to let you know that your <strong>internship has been cancelled</strong> by the internship administration. Your account has been closed, so you can no longer log in to the portal.'
          : 'We are writing to let you know that your <strong>internship application has been cancelled</strong> by the internship administration. It will not be reviewed.'
      }</p>
      <p>If you have any questions, or think this was a mistake, please contact the internship administration.</p>
    `,
  };
}

// An admin reactivated a deactivated intern's account.
function accountReactivatedEmail({ firstName, email }) {
  return {
    subject: 'Your internship account has been reactivated',
    html: `
      <p>Hi ${firstName},</p>
      <p>Good news: your internship account has been <strong>reactivated</strong> by the internship administration, and your internship is active again.</p>
      <p>You can log in to the portal again with your usual email and password:</p>
      <ul>
        <li><strong>Email:</strong> ${email}</li>
      </ul>
      <p>If you no longer remember your password, use <strong>"Forgot password"</strong> on the login page.</p>
    `,
  };
}

// Sent after a successful password reset (authController#resetPassword),
// so the owner notices if someone else reset it.
function passwordWasResetEmail({ firstName }) {
  return {
    subject: 'Your password has been changed',
    html: `
      <p>Hi ${firstName},</p>
      <p>The password of your Internship Management Portal account was just <strong>changed</strong> using a password reset link.</p>
      <p>If you did this, you can ignore this email.</p>
      <p>If you did <strong>not</strong> change your password, please contact the internship administration.</p>
    `,
  };
}

module.exports = {
  passwordWasResetEmail,
  accountReactivatedEmail,
  cancelledByInternEmail,
  cancelledByAdminEmail,
  welcomeUserEmail,
  applicationAcceptedEmail,
  applicationRejectedEmail,
  assignmentDeadlineEmail,
  documentRequestDeadlineEmail,
  forgotPasswordEmail,
};
