const express = require("express");
const { getDashboard } = require("../controllers/dashboardController");
const { optionalAuth } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/", optionalAuth, asyncHandler(getDashboard));

module.exports = router;
