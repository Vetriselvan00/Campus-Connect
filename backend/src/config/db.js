const mongoose = require("mongoose");
const { env } = require("./env");

async function connectDatabase() {
  if (env.useDemoData) {
    return { connected: false, mode: "demo" };
  }

  if (!env.mongoUri) {
    return { connected: false, mode: "missing-uri" };
  }

  await mongoose.connect(env.mongoUri);
  const { seedMongoUsers } = require("../seeds/seedMongoUsers");
  await seedMongoUsers();
  return { connected: true, mode: "mongodb" };
}

module.exports = { connectDatabase, mongoose };
