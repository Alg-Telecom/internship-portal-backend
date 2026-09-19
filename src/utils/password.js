const crypto = require('crypto');

// Shared by usersController (admin-created accounts) and
// applicationsController (accepted-application accounts) so both flows
// generate a temporary password the same way.
function generateTemporaryPassword() {
  return crypto.randomBytes(6).toString('hex');
}

module.exports = { generateTemporaryPassword };
