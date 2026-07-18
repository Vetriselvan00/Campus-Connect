const express = require("express");
const {
  applyToOpportunity,
  createOpportunity,
  listOpportunities
} = require("../controllers/opportunityController");
const { requireAdmin, requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", listOpportunities);
router.post("/", requireAdmin, createOpportunity);
router.post("/:id/apply", requireAuth, applyToOpportunity);

module.exports = router;
