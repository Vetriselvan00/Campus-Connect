const express = require("express");
const multer = require("multer");
const path = require("path");
const {
  createItem,
  createLostFound,
  deleteItem,
  getItem,
  listItems,
  listLostFound
} = require("../controllers/itemController");
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

router.get("/items", optionalAuth, asyncHandler(listItems));
router.get("/items/:id", optionalAuth, asyncHandler(getItem));
router.post("/items", requireAuth, upload.single("image"), asyncHandler(createItem));
router.delete("/items/:id", requireAuth, asyncHandler(deleteItem));
router.get("/lost-found", listLostFound);
router.post("/lost-found", requireAuth, createLostFound);

module.exports = router;
