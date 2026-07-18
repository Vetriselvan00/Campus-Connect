const { signAuthToken } = require("../services/tokenService");
const { createUser, findUserByEmail, toPublicUser } = require("../services/userService");
const { comparePassword, hashPassword } = require("../utils/passwords");
const { isCollegeEmail } = require("../utils/validators");

function setAuthCookie(res, token) {
  res.cookie("campus_token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

async function register(req, res) {
  const {
    name,
    collegeEmail,
    department,
    year,
    registerNumber,
    phone,
    memberTag,
    about,
    password,
    confirmPassword
  } = req.body;

  if (!name || !collegeEmail || !department || !year || !phone || !password) {
    res.status(400).json({ message: "Please fill in all required registration fields." });
    return;
  }

  if (!isCollegeEmail(collegeEmail)) {
    res.status(400).json({ message: "Please use a valid college email address." });
    return;
  }

  if (password !== confirmPassword) {
    res.status(400).json({ message: "Passwords do not match." });
    return;
  }

  const existingUser = await findUserByEmail(collegeEmail);
  if (existingUser) {
    res.status(409).json({ message: "An account with this email already exists." });
    return;
  }

  const user = await createUser({
    name,
    collegeEmail,
    department,
    year,
    registerNumber: registerNumber || String(collegeEmail || "").split("@")[0],
    phone,
    memberTag: memberTag || "Campus Member",
    about: about || "",
    passwordHash: await hashPassword(password)
  });

  res.status(201).json({
    message: "Registration successful. Please log in with your new account.",
    user: toPublicUser(user)
  });
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = await findUserByEmail(email);

  if (!user) {
    res.status(401).json({ message: "Invalid email or password." });
    return;
  }

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    res.status(401).json({ message: "Invalid email or password." });
    return;
  }

  const token = signAuthToken(toPublicUser(user));
  setAuthCookie(res, token);
  res.json({ message: "Login successful.", user: toPublicUser(user) });
}

function me(req, res) {
  if (!req.user) {
    res.status(401).json({ message: "Not authenticated." });
    return;
  }
  res.json({ user: toPublicUser(req.user) });
}

function logout(_req, res) {
  res.clearCookie("campus_token");
  res.json({ message: "Logged out." });
}

module.exports = { login, logout, me, register };
