const { searchUsersByAcademicId } = require("../services/userService");

async function searchUsers(req, res) {
  const users = await searchUsersByAcademicId(req.query.q, req.user.id || req.user._id?.toString());
  res.json({ users });
}

module.exports = { searchUsers };
