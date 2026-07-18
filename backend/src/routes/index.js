const express = require("express");
const announcementRoutes = require("./announcementRoutes");
const authRoutes = require("./authRoutes");
const adminRoutes = require("./adminRoutes");
const bookmarkRoutes = require("./bookmarkRoutes");
const chatRoutes = require("./chatRoutes");
const clubRoutes = require("./clubRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const doubtRoutes = require("./doubtRoutes");
const friendRoutes = require("./friendRoutes");
const itemRoutes = require("./itemRoutes");
const opportunityRoutes = require("./opportunityRoutes");
const projectIdeaRoutes = require("./projectIdeaRoutes");
const profileRoutes = require("./profileRoutes");
const resourceRoutes = require("./resourceRoutes");
const userRoutes = require("./userRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/users", userRoutes);
router.use("/friends", friendRoutes);
router.use("/resources", resourceRoutes);
router.use("/doubts", doubtRoutes);
router.use("/", itemRoutes);
router.use("/announcements", announcementRoutes);
router.use("/opportunities", opportunityRoutes);
router.use("/project-ideas", projectIdeaRoutes);
router.use("/", clubRoutes);
router.use("/chats", chatRoutes);
router.use("/bookmarks", bookmarkRoutes);
router.use("/admin", adminRoutes);
router.use("/dashboard", dashboardRoutes);

module.exports = router;
