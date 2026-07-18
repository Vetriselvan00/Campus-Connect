const {
  createResource: createResourceRecord,
  deleteResource: deleteResourceRecord,
  ensureResourceShareChat,
  getResourceById,
  listResources: listResourceRecords,
  toggleBookmark: toggleBookmarkRecord
} = require("../services/campusMongoService");
const { findUserById } = require("../services/userService");
const { isAdminUser } = require("../utils/access");

async function listResources(req, res) {
  const resources = await listResourceRecords({
    type: req.query.type,
    department: req.query.department,
    difficulty: req.query.difficulty,
    search: req.query.search,
    userId: req.user ? (req.user.id || req.user._id?.toString()) : null,
    includePending: isAdminUser(req.user)
  });
  res.json({ resources });
}

async function getResource(req, res) {
  const resource = await getResourceById(
    req.params.id,
    req.user ? req.user.id || req.user._id?.toString() : null,
    isAdminUser(req.user)
  );
  if (!resource) {
    res.status(404).json({ message: "Resource not found." });
    return;
  }

  res.json({ resource });
}

async function createResource(req, res) {
  const fileUrl = req.file ? `/uploads/${req.file.filename}` : req.body.externalUrl || "";
  const resource = await createResourceRecord({
    type: req.body.type || "notes",
    title: req.body.title,
    description: req.body.description,
    department: req.body.department,
    subject: req.body.subject,
    category: req.body.category,
    difficulty: req.body.difficulty,
    fileType: req.file ? req.file.mimetype : req.body.fileType || "LINK",
    fileUrl,
    externalUrl: req.body.externalUrl || "",
    uploaderId: req.user.id || req.user._id?.toString()
  });

  res.status(201).json({ message: "Resource submitted successfully. It will be visible after admin approval.", resource });
}

async function toggleBookmark(req, res) {
  const result = await toggleBookmarkRecord(req.user.id || req.user._id?.toString(), req.params.id);
  res.json({
    message: result.bookmarked ? "Bookmark added." : "Bookmark removed.",
    ...result
  });
}

async function shareResource(req, res) {
  const userId = req.user.id || req.user._id?.toString();
  const resource = await getResourceById(req.params.id, userId, isAdminUser(req.user));
  if (!resource) {
    res.status(404).json({ message: "Resource not found." });
    return;
  }

  if (resource.status !== "approved" && resource.uploaderId !== userId && !isAdminUser(req.user)) {
    res.status(403).json({ message: "Only approved notes can be shared." });
    return;
  }

  const recipient = await findUserById(req.body.recipientId);
  if (!recipient) {
    res.status(404).json({ message: "Student not found for sharing." });
    return;
  }

  const recipientId = recipient.id || recipient._id?.toString();
  if (recipientId === userId) {
    res.status(400).json({ message: "Choose another student to share this note." });
    return;
  }

  const chat = await ensureResourceShareChat({
    resourceId: resource.id,
    resourceTitle: resource.title,
    resourceUrl: resource.fileUrl || resource.externalUrl || "/notes.html",
    senderId: userId,
    senderName: req.user.name,
    recipientId,
    recipientName: recipient.name
  });

  res.status(201).json({ message: `Note shared with ${recipient.name}.`, chat });
}

async function deleteResource(req, res) {
  const result = await deleteResourceRecord(
    req.params.id,
    req.user.id || req.user._id?.toString(),
    isAdminUser(req.user)
  );
  if (result.error) {
    res.status(result.error.includes("not found") ? 404 : 403).json({ message: result.error });
    return;
  }

  res.json({ message: "Note deleted successfully." });
}

module.exports = { createResource, deleteResource, getResource, listResources, shareResource, toggleBookmark };
