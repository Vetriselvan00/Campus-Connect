const { demoStore } = require("../services/demoStore");

function listAnnouncements(_req, res) {
  res.json({ announcements: demoStore.listAnnouncements() });
}

function createAnnouncement(req, res) {
  const announcement = demoStore.createAnnouncement({
    title: req.body.title,
    description: req.body.description,
    tag: req.body.tag || "Announcement",
    dateLabel: req.body.dateLabel || new Date().toLocaleDateString("en-GB"),
    authorId: req.user.id || req.user._id?.toString(),
    authorName: req.user.name
  });
  res.status(201).json({ message: "Announcement published.", announcement });
}

module.exports = { createAnnouncement, listAnnouncements };
