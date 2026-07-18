const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { isAdminUser } = require("../utils/access");

function signAuthToken(user) {
  const userId = user.id || user._id?.toString();
  return jwt.sign(
    {
      sub: userId,
      email: user.collegeEmail,
      isAdmin: isAdminUser(user)
    },
    env.jwtSecret,
    { expiresIn: "7d" }
  );
}

function verifyAuthToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

module.exports = { signAuthToken, verifyAuthToken };
