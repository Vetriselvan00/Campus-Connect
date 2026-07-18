const express = require("express");
const { login, logout, me, register } = require("../controllers/authController");
const { asyncHandler } = require("../utils/asyncHandler");
const { optionalAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.post("/logout", logout);
router.get("/me", optionalAuth, me);

module.exports = router;
