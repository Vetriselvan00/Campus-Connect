const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const env = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || "",
  jwtSecret: process.env.JWT_SECRET || "campus-connect-dev-secret",
  adminEmail: process.env.ADMIN_EMAIL || "2023000001@student.annauniv.edu",
  clientPath: process.env.CLIENT_PATH || "../frontend/pages",
  useDemoData: String(process.env.USE_DEMO_DATA || "true").toLowerCase() === "true"
};

module.exports = { env };
