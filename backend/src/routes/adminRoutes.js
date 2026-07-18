const express = require("express");
const { getOverview, moderateEntity, registerStudent } = require("../controllers/adminController");
const { requireAdmin } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/overview", requireAdmin, asyncHandler(getOverview));
router.patch("/moderation/:id", requireAdmin, asyncHandler(moderateEntity));
router.post("/students", requireAdmin, asyncHandler(registerStudent));

module.exports = router;
