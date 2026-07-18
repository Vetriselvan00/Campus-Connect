const express = require("express");
const { listBookmarks } = require("../controllers/bookmarkController");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/", requireAuth, asyncHandler(listBookmarks));

module.exports = router;
