const express = require("express");
const {
  addIdeaReply,
  createProjectIdea,
  getProjectIdea,
  listProjectIdeas
} = require("../controllers/projectIdeaController");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/", asyncHandler(listProjectIdeas));
router.get("/:id", asyncHandler(getProjectIdea));
router.post("/", requireAuth, asyncHandler(createProjectIdea));
router.post("/:id/replies", requireAuth, asyncHandler(addIdeaReply));

module.exports = router;
