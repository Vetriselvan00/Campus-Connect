const express = require("express");
const { acceptFriendRequest, getNetwork, sendFriendRequest } = require("../controllers/friendController");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/network", requireAuth, asyncHandler(getNetwork));
router.post("/requests", requireAuth, asyncHandler(sendFriendRequest));
router.patch("/requests/:id/accept", requireAuth, asyncHandler(acceptFriendRequest));

module.exports = router;
