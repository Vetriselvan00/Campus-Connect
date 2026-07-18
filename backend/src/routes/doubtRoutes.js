const express = require("express");
const multer = require("multer");
const path = require("path");
const {
  addAnswer,
  createDoubt,
  getDoubt,
  listDoubts,
  upvoteAnswer
} = require("../controllers/doubtController");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
const storage = multer.diskStorage({
  destination: path.resolve(__dirname, "../../uploads"),
  filename: (_req, file, callback) => {
    callback(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`);
  }
});
const upload = multer({ storage });

router.get("/", asyncHandler(listDoubts));
router.get("/:id", asyncHandler(getDoubt));
router.post("/", requireAuth, upload.single("image"), asyncHandler(createDoubt));
router.post("/:id/answers", requireAuth, asyncHandler(addAnswer));
router.post("/answers/:id/upvote", requireAuth, asyncHandler(upvoteAnswer));

module.exports = router;
