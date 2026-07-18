const { toPublicUser, updateUser } = require("../services/userService");
const { pickDefined } = require("../utils/validators");

function getProfile(req, res) {
  res.json({ profile: toPublicUser(req.user) });
}

async function updateProfile(req, res) {
  const updates = pickDefined(req.body, [
    "name",
    "department",
    "year",
    "registerNumber",
    "phone",
    "memberTag",
    "about"
  ]);
  const profile = await updateUser(req.user.id, updates);
  res.json({ message: "Profile updated successfully.", profile: toPublicUser(profile) });
}

module.exports = { getProfile, updateProfile };
