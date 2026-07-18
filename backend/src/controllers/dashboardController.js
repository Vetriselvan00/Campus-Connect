const { getDashboardSummary } = require("../services/campusMongoService");

async function getDashboard(req, res) {
  res.json({ dashboard: await getDashboardSummary(req.user ? req.user.id || req.user._id?.toString() : null) });
}

module.exports = { getDashboard };
