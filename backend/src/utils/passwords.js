const bcrypt = require("bcryptjs");

function isStoredAsPlaintext(hash) {
  return typeof hash === "string" && hash.startsWith("$plain$");
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function comparePassword(password, hash) {
  if (!hash) {
    return false;
  }

  if (isStoredAsPlaintext(hash)) {
    return password === hash.replace("$plain$", "");
  }

  return bcrypt.compare(password, hash);
}

module.exports = { comparePassword, hashPassword };
