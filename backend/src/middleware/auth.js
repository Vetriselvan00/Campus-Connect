const { findUserById } = require("../services/userService");
const { verifyAuthToken } = require("../services/tokenService");
const { isAdminUser } = require("../utils/access");

function getTokenFromRequest(req) {
  const cookieToken = req.cookies ? req.cookies.campus_token : null;
  const authHeader = req.headers.authorization || "";

  if (cookieToken) {
    return cookieToken;
  }

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "");
  }

  return null;
}

async function optionalAuth(req, _res, next) {
  const token = getTokenFromRequest(req);

  if (!token) {
    req.user = null;
    next();
    return;
  }

  try {
    const payload = verifyAuthToken(token);
    req.user = await findUserById(payload.sub);
  } catch (_error) {
    req.user = null;
  }

  next();
}

function requireAuth(req, res, next) {
  optionalAuth(req, res, () => {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    next();
  });
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!isAdminUser(req.user)) {
      res.status(403).json({ message: "Admin access only." });
      return;
    }

    next();
  });
}

module.exports = { optionalAuth, requireAdmin, requireAuth };
