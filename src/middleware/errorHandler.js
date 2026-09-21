const multer = require("multer");
const ApiError = require("../utils/ApiError");

/**
 * Central error handler — a safety net, not a replacement for the
 * try/catch already inside every controller. Express 5 forwards a
 * rejected async handler here automatically, so this only catches what
 * slips past a controller's own try/catch: a malformed JSON request body
 * (from express.json()), a multer upload error (e.g. file too large), an
 * oversized request body, an unexpected Prisma error, or a route that
 * genuinely doesn't exist. Must be registered LAST, after every route.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ message: err.message, details: err.details });
  }

  if (err instanceof multer.MulterError) {
    // e.g. LIMIT_FILE_SIZE when an upload exceeds the configured limit —
    // a bad request from the client, not a server failure.
    return res.status(400).json({ message: err.message });
  }

  if (err && err.type === "entity.too.large") {
    // JSON body over express.json()'s limit — most likely an oversized
    // request payload.
    return res.status(413).json({ message: "Request body is too large." });
  }

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    // Malformed JSON body — express.json() throws this before any route
    // handler runs.
    return res.status(400).json({ message: "Malformed JSON in request body." });
  }

  if (err && err.code === "P2002") {
    // Prisma unique constraint violation
    return res.status(409).json({ message: "A record with these details already exists." });
  }

  if (err && err.code === "P2025") {
    // Prisma "record not found" (e.g. update/delete on a missing id)
    return res.status(404).json({ message: "Record not found." });
  }

  if (err && err.code === "P2003") {
    // Prisma foreign key constraint failed
    return res.status(409).json({ message: "This record is referenced by other data and cannot be modified this way." });
  }

  console.error(err);
  return res.status(500).json({ message: "Something went wrong on the server." });
}

function notFoundHandler(req, res) {
  return res.status(404).json({ message: `No route for ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFoundHandler };
