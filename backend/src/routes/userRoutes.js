const express = require("express");
const { searchUsers } = require("../controllers/userController");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/search", requireAuth, asyncHandler(searchUsers));

module.exports = router;
