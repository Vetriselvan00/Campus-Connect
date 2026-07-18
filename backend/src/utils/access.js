const { env } = require("../config/env");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isAdminEmail(email) {
  return normalizeEmail(email) === normalizeEmail(env.adminEmail);
}

function isAdminUser(user) {
  if (!user) {
    return false;
  }

  return isAdminEmail(user.collegeEmail);
}

module.exports = { isAdminEmail, isAdminUser, normalizeEmail };
