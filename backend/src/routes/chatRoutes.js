const express = require("express");
const {
  blockChat,
  createMessage,
  deleteMessage,
  listChats,
  listMessages,
  reportChat,
  startAdminChat,
  startAdminStudentChat,
  startDoubtChat,
  startFriendChat,
  startProjectIdeaChat,
  startQuickSportChat,
  startItemChat
} = require("../controllers/chatController");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/", requireAuth, asyncHandler(listChats));
router.post("/admin", requireAuth, asyncHandler(startAdminChat));
router.post("/admin/:userId", requireAuth, asyncHandler(startAdminStudentChat));
router.post("/doubt/:doubtId", requireAuth, asyncHandler(startDoubtChat));
router.post("/friend/:friendId", requireAuth, asyncHandler(startFriendChat));
router.post("/item/:itemId", requireAuth, asyncHandler(startItemChat));
router.post("/project-idea/:ideaId", requireAuth, asyncHandler(startProjectIdeaChat));
router.post("/quick-sport/:quickSportId", requireAuth, asyncHandler(startQuickSportChat));
router.get("/:id/messages", requireAuth, asyncHandler(listMessages));
router.post("/:id/messages", requireAuth, asyncHandler(createMessage));
router.delete("/:id/messages/:messageId", requireAuth, asyncHandler(deleteMessage));
router.post("/:id/block", requireAuth, asyncHandler(blockChat));
router.post("/:id/report", requireAuth, asyncHandler(reportChat));

module.exports = router;
