const express = require("express");
const multer = require("multer");
const path = require("path");
const {
  createResource,
  deleteResource,
  getResource,
  listResources,
  shareResource,
  toggleBookmark
} = require("../controllers/resourceController");
const { optionalAuth, requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
const storage = multer.diskStorage({
  destination: path.resolve(__dirname, "../../uploads"),
  filename: (_req, file, callback) => {
    callback(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`);
  }
});
const upload = multer({ storage });

router.get("/", optionalAuth, asyncHandler(listResources));
router.get("/:id", optionalAuth, asyncHandler(getResource));
router.post("/", requireAuth, upload.single("file"), asyncHandler(createResource));
router.post("/:id/bookmark", requireAuth, asyncHandler(toggleBookmark));
router.post("/:id/share", requireAuth, asyncHandler(shareResource));
router.delete("/:id", requireAuth, asyncHandler(deleteResource));

module.exports = router;
