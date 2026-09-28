// Runs once at startup (server.js). In production, refuse to start with
// missing or development-grade secrets instead of running insecurely.
// In development it only warns, so local work is never blocked.

const REQUIRED = ["DATABASE_URL", "JWT_SECRET", "FRONTEND_URL", "MAIL_FROM"];
const MIN_JWT_SECRET_LENGTH = 32;

function checkEnv() {
  const isProduction = process.env.NODE_ENV === "production";
  const problems = [];

  if (!process.env.JWT_SECRET) {
    problems.push("JWT_SECRET is missing.");
  } else if (process.env.JWT_SECRET.length < MIN_JWT_SECRET_LENGTH) {
    problems.push(
      `JWT_SECRET is too short (${process.env.JWT_SECRET.length} characters, need at least ${MIN_JWT_SECRET_LENGTH}).`,
    );
  }

  if (isProduction) {
    for (const name of REQUIRED) {
      if (!process.env[name]) problems.push(`${name} is missing.`);
    }
    if ((process.env.FRONTEND_URL || "").includes("localhost")) {
      problems.push("FRONTEND_URL still points to localhost.");
    }
    if (/change[_-]?me|your_|example/i.test(process.env.JWT_SECRET || "")) {
      problems.push(
        "JWT_SECRET still has the placeholder value from .env.example.",
      );
    }
  }

  if (problems.length === 0) return;
  const message = `[config] ${problems.join(" ")} Generate a secret with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`;
  if (isProduction) {
    console.error(message);
    process.exit(1);
  }
  console.warn(message);
}

module.exports = { checkEnv };
