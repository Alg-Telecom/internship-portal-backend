const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST,
  port: Number(process.env.MAILTRAP_PORT),
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  },
});

async function sendMail({ to, subject, html }) {
  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject,
      html,
    });
    console.log(`[mailer] sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    // A mail failure should never break the request that triggered it —
    // log it and move on, same spirit as the notification helpers.
    console.error(`[mailer] failed to send to ${to} ("${subject}"):`, err.message);
    return null;
  }
}

module.exports = { sendMail };
