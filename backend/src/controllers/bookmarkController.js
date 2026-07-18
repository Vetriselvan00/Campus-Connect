const { listBookmarks: listBookmarkRecords } = require("../services/campusMongoService");

async function listBookmarks(req, res) {
  res.json({ bookmarks: await listBookmarkRecords(req.user.id || req.user._id?.toString()) });
}

module.exports = { listBookmarks };
