const express = require("express");
const { createAnnouncement, listAnnouncements } = require("../controllers/announcementController");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/", listAnnouncements);
router.post("/", requireAdmin, createAnnouncement);

module.exports = router;
