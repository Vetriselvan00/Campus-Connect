const { AcademicResource, ItemListing } = require("../models");
const { demoStore } = require("../services/demoStore");
const {
  listClubs,
  listAdminInbox,
  listClubRequests,
  listItems,
  listPendingChatReports,
  listResources,
  moderateEntity
} = require("../services/campusMongoService");
const { createUser, findAdminUser, findUserByEmail, listUsers, toPublicUser } = require("../services/userService");
const { hashPassword } = require("../utils/passwords");
const { isCollegeEmail } = require("../utils/validators");

async function getOverview(_req, res) {
  const admin = await findAdminUser();
  const adminId = admin?.id || admin?._id?.toString();
  const [users, uploads, items, pendingReports, adminInbox, clubs, clubRequests] = await Promise.all([
    listUsers(),
    listResources({ includePending: true }),
    listItems({ includePending: true }),
    listPendingChatReports(),
    adminId ? listAdminInbox(adminId) : [],
    listClubs(),
    listClubRequests()
  ]);
  const publicUsers = users.map(toPublicUser);
  const filteredClubRequests = (clubRequests || []).filter((request) => (request.requestType || "club") === "club");
  const sportRequests = (clubRequests || []).filter((request) => request.requestType === "sport");
  const adminInboxUserIds = new Set(
    adminInbox.flatMap((thread) => (thread.participantIds || []).filter((participantId) => participantId !== adminId))
  );
  const recentUsers = publicUsers
    .map((user) => ({
      ...user,
      hasAdminDm: adminInboxUserIds.has(user.id)
    }))
    .sort((left, right) => Number(right.hasAdminDm) - Number(left.hasAdminDm))
    .slice(0, 6);
  const moderationQueue = [
    ...uploads
      .filter((entry) => entry.status === "pending")
      .map((entry) => ({
        id: entry.id,
        module: "resource",
        label: "Notes",
        title: entry.title,
        status: entry.status
      })),
    ...items
      .filter((entry) => entry.status === "pending")
      .map((entry) => ({
        id: entry.id,
        module: "item",
        label: "Items",
        title: entry.title,
        status: entry.status
      })),
    ...pendingReports.map((entry) => ({
      id: entry.id,
      module: "report",
      label: "Chat Report",
      title: `${entry.thread?.title || "Private Chat"} • ${entry.reason}`,
      status: entry.status
    }))
  ];

  res.json({
    overview: {
      counts: {
        users: publicUsers.length,
        uploads: await AcademicResource.countDocuments(),
        listings: await ItemListing.countDocuments(),
        reports: pendingReports.length
      },
      moderationQueue,
      pendingReports,
      users: recentUsers,
      allUsers: publicUsers,
      adminInbox,
      activityFeed: [
        ...recentUsers.map((user) => ({
          type: user.hasAdminDm ? "direct-message" : "user",
          title: user.hasAdminDm ? `${user.name} messaged admin` : `${user.name} registered`,
          description: `${user.department || "Department pending"} • ${user.collegeEmail}`,
          createdAt: user.createdAt || new Date().toISOString()
        })),
        ...uploads.slice(0, 2).map((item) => ({
          type: "resource",
          title: item.title,
          description: `${item.category || item.type} • ${item.department || "Department"}`,
          createdAt: item.createdAt || new Date().toISOString()
        })),
        ...items.slice(0, 2).map((item) => ({
          type: "item",
          title: item.title,
          description: `${item.itemType || "Item"} • ${item.department || "Department"}`,
          createdAt: item.createdAt || new Date().toISOString()
        }))
      ]
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .slice(0, 8),
      uploads: uploads.slice(0, 10),
      items: items.slice(0, 10),
      announcements: demoStore.listAnnouncements().slice(0, 10),
      clubRequests: filteredClubRequests,
      sportRequests,
      sports: clubs
    }
  });
}

async function moderateEntityController(req, res) {
  const entity = await moderateEntity(req.body.module, req.params.id, req.body.status);
  if (!entity) {
    res.status(404).json({ message: "Moderation target not found." });
    return;
  }

  res.json({ message: "Status updated.", entity });
}

async function registerStudent(req, res) {
  const {
    name,
    collegeEmail,
    department,
    year,
    registerNumber,
    phone,
    memberTag,
    about,
    password
  } = req.body;

  if (!name || !collegeEmail || !department || !year || !phone || !password) {
    res.status(400).json({ message: "Please fill in all required student fields." });
    return;
  }

  if (!isCollegeEmail(collegeEmail)) {
    res.status(400).json({ message: "Please use a valid college email address." });
    return;
  }

  const existingUser = await findUserByEmail(collegeEmail);
  if (existingUser) {
    res.status(409).json({ message: "A student with this email already exists." });
    return;
  }

  const user = await createUser({
    name: String(name).trim(),
    collegeEmail: String(collegeEmail).trim().toLowerCase(),
    department: String(department).trim(),
    year: String(year).trim(),
    registerNumber: String(registerNumber || collegeEmail).trim().split("@")[0],
    phone: String(phone).trim(),
    memberTag: String(memberTag || "Campus Member").trim(),
    about: String(about || "").trim(),
    passwordHash: await hashPassword(password)
  });

  res.status(201).json({
    message: "Student registered successfully.",
    user: toPublicUser(user)
  });
}

module.exports = { getOverview, moderateEntity: moderateEntityController, registerStudent };
