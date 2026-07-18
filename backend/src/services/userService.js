const { env } = require("../config/env");
const { User } = require("../models");
const { isAdminUser } = require("../utils/access");
const { demoStore } = require("./demoStore");

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toPublicUser(user) {
  if (!user) {
    return null;
  }

  const object = typeof user.toObject === "function" ? user.toObject() : { ...user };
  object.id = object.id || object._id?.toString();
  object.registerNumber = object.registerNumber || object.collegeEmail?.split("@")[0] || "";
  object.memberTag = object.memberTag || "Campus Member";
  object.isAdmin = isAdminUser(object);
  delete object.passwordHash;
  delete object.role;
  return object;
}

async function findUserByEmail(email) {
  if (env.useDemoData) {
    return demoStore.findUserByEmail(email);
  }

  return User.findOne({ collegeEmail: String(email || "").trim().toLowerCase() });
}

async function findAdminUser() {
  return findUserByEmail(env.adminEmail);
}

async function findUserById(userId) {
  if (env.useDemoData) {
    return demoStore.findUserById(userId);
  }

  return User.findById(userId);
}

async function createUser(payload) {
  if (env.useDemoData) {
    return demoStore.createUser(payload);
  }

  const normalized = {
    ...payload,
    collegeEmail: String(payload.collegeEmail || "").trim().toLowerCase()
  };
  const user = await User.create(normalized);
  return user;
}

async function updateUser(userId, updates) {
  if (env.useDemoData) {
    return demoStore.updateUser(userId, updates);
  }

  return User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true });
}

async function countUsers() {
  if (env.useDemoData) {
    return demoStore.getUsers().length;
  }

  return User.countDocuments();
}

async function listUsers() {
  if (env.useDemoData) {
    return demoStore.getUsers();
  }

  return User.find().sort({ createdAt: -1 });
}

async function searchUsersByAcademicId(query, currentUserId) {
  const normalized = String(query || "").trim();
  if (!normalized) {
    return [];
  }

  if (env.useDemoData) {
    return demoStore.searchUsersByAcademicId(normalized, currentUserId);
  }

  const safePattern = new RegExp(escapeRegex(normalized), "i");
  const prefixPattern = new RegExp(`^${escapeRegex(normalized)}@`, "i");
  const users = await User.find({
    ...(currentUserId ? { _id: { $ne: currentUserId } } : {}),
    $or: [{ name: safePattern }, { registerNumber: safePattern }, { collegeEmail: prefixPattern }]
  })
    .sort({ createdAt: -1 })
    .limit(8);

  return users.map(toPublicUser);
}

module.exports = {
  countUsers,
  createUser,
  findAdminUser,
  findUserByEmail,
  findUserById,
  listUsers,
  searchUsersByAcademicId,
  toPublicUser,
  updateUser
};
