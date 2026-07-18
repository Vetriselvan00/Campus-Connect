const { seedData } = require("./seedData");
const { User } = require("../models");
const { hashPassword } = require("../utils/passwords");

async function seedMongoUsers() {
  for (const user of seedData.users) {
    const existingUser = await User.findOne({ collegeEmail: user.collegeEmail.toLowerCase() });
    if (existingUser) {
      continue;
    }

    await User.create({
      name: user.name,
      collegeEmail: user.collegeEmail.toLowerCase(),
      department: user.department,
      year: user.year,
      registerNumber: user.registerNumber || user.collegeEmail.split("@")[0],
      phone: user.phone,
      memberTag: user.memberTag || "Campus Member",
      about: user.about,
      passwordHash: await hashPassword(user.passwordHash.replace("$plain$", ""))
    });
  }
}

module.exports = { seedMongoUsers };
