const { rateLimit } = require('express-rate-limit');

// Limits per visitor IP on the public / authentication routes, so nobody can
// try thousands of passwords on /auth/login or spam the public application
// form. When a limit is hit the API answers 429 with code RATE_LIMITED; the
// frontend (services/api/httpClient.js) turns that into a translated
// "Too many attempts, try again in N minutes" message.
//
// Behind a reverse proxy in production (nginx, Render, Railway...), set
// TRUST_PROXY in .env (see server.js) — otherwise every visitor appears
// with the proxy's IP and they would all share one limit.

const MINUTE = 60 * 1000;

function limiter({ windowMinutes, limit, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs: windowMinutes * MINUTE,
    limit,
    skipSuccessfulRequests,
    standardHeaders: 'draft-8', // RateLimit / Retry-After headers
    legacyHeaders: false,
    handler: (req, res, next, options) => {
      const resetTime = req.rateLimit?.resetTime;
      const retryAfterMinutes = resetTime
        ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / MINUTE))
        : windowMinutes;
      res.status(options.statusCode).json({
        code: 'RATE_LIMITED',
        retryAfterMinutes,
        message: `Too many attempts. Please try again in ${retryAfterMinutes} minute(s).`,
      });
    },
  });
}

// Wrong passwords only: 10 failed logins per 15 min. Successful logins
// don't count, so a real user is never locked out by logging in normally.
const loginLimiter = limiter({ windowMinutes: 15, limit: 10, skipSuccessfulRequests: true });

// Wrong current password on Settings > Change password: same rule as login
// (a stolen session must not be able to brute-force the real password).
const changePasswordLimiter = limiter({ windowMinutes: 15, limit: 10, skipSuccessfulRequests: true });

// "Forgot password" emails and reset-link submissions: 5 per 15 min.
const passwordResetLimiter = limiter({ windowMinutes: 15, limit: 5 });

// Public application form: 5 submissions per hour per IP.
const applicationSubmitLimiter = limiter({ windowMinutes: 60, limit: 5 });

// Public "cancel my application" (email + password): 10 per 15 min.
const applicationCancelLimiter = limiter({ windowMinutes: 15, limit: 10 });

// "Is this email already used?" check on the apply form: 30 per 15 min —
// generous for a real applicant, stops someone listing which emails applied.
const emailCheckLimiter = limiter({ windowMinutes: 15, limit: 30 });

module.exports = {
  loginLimiter,
  changePasswordLimiter,
  passwordResetLimiter,
  applicationSubmitLimiter,
  applicationCancelLimiter,
  emailCheckLimiter,
};
