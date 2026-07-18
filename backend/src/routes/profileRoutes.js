const express = require("express");
const { getProfile, updateProfile } = require("../controllers/profileController");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/", requireAuth, getProfile);
router.patch("/", requireAuth, asyncHandler(updateProfile));

module.exports = router;
