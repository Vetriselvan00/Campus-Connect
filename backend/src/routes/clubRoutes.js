const express = require("express");
const multer = require("multer");
const path = require("path");
const {
  createClub,
  createClubAnnouncement,
  createClubFromRequest,
  createClubOpenCall,
  createMatch,
  createQuickSport,
  deleteClubEntity,
  deleteQuickSport,
  getClub,
  getClubRoom,
  getClubRequest,
  getTeam,
  joinClub,
  listClubRequests,
  listClubs,
  listQuickSports,
  listMatches,
  submitClubRequest,
  submitSportRequest
} = require("../controllers/clubController");
const { optionalAuth, requireAdmin, requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
const storage = multer.diskStorage({
  destination: path.resolve(__dirname, "../../uploads"),
  filename: (_req, file, callback) => {
    callback(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`);
  }
});
const upload = multer({ storage });

router.get("/clubs", optionalAuth, asyncHandler(listClubs));
router.post(
  "/clubs/requests",
  requireAuth,
  upload.fields([
    { name: "passportPhoto", maxCount: 1 },
    { name: "collegeIdCard", maxCount: 1 },
    { name: "clubLogo", maxCount: 1 },
    { name: "clubHeadProof", maxCount: 1 }
  ]),
  asyncHandler(submitClubRequest)
);
router.post(
  "/sports/requests",
  requireAuth,
  upload.fields([
    { name: "passportPhoto", maxCount: 1 },
    { name: "collegeIdCard", maxCount: 1 },
    { name: "sportHeadProof", maxCount: 1 },
    { name: "sportImage", maxCount: 1 }
  ]),
  asyncHandler(submitSportRequest)
);
router.get("/clubs/requests", requireAdmin, asyncHandler(listClubRequests));
router.get("/clubs/requests/:id", requireAdmin, asyncHandler(getClubRequest));
router.post("/clubs/requests/:id/create", requireAdmin, asyncHandler(createClubFromRequest));
router.get("/sports/requests/:id", requireAdmin, asyncHandler(getClubRequest));
router.post("/sports/requests/:id/create", requireAdmin, asyncHandler(createClubFromRequest));
router.post("/clubs", requireAdmin, asyncHandler(createClub));
router.get("/sports/quick-teams", requireAuth, asyncHandler(listQuickSports));
router.post("/sports/quick-teams", requireAuth, asyncHandler(createQuickSport));
router.delete("/sports/quick-teams/:id", requireAuth, asyncHandler(deleteQuickSport));
router.get("/clubs/:id/room", requireAuth, asyncHandler(getClubRoom));
router.post("/clubs/:id/open-calls", requireAuth, asyncHandler(createClubOpenCall));
router.post("/clubs/:id/join", requireAuth, asyncHandler(joinClub));
router.post("/clubs/:id/announcements", requireAuth, asyncHandler(createClubAnnouncement));
router.get("/clubs/:id", asyncHandler(getClub));
router.get("/teams/:id", asyncHandler(getTeam));
router.get("/matches", asyncHandler(listMatches));
router.post("/matches", requireAdmin, asyncHandler(createMatch));
router.delete("/clubs/:id", requireAdmin, asyncHandler(deleteClubEntity));

module.exports = router;
