const { demoStore } = require("../services/demoStore");
const {
  createItem: createItemRecord,
  deleteItem: deleteItemRecord,
  getItemById,
  listItems: listItemRecords
} = require("../services/campusMongoService");
const { isAdminUser } = require("../utils/access");

async function listItems(req, res) {
  const items = await listItemRecords({
    department: req.query.department,
    itemType: req.query.itemType,
    search: req.query.search,
    userId: req.user ? (req.user.id || req.user._id?.toString()) : null,
    includePending: isAdminUser(req.user)
  });
  res.json({ items });
}

async function getItem(req, res) {
  const item = await getItemById(
    req.params.id,
    req.user ? req.user.id || req.user._id?.toString() : null,
    isAdminUser(req.user)
  );
  if (!item) {
    res.status(404).json({ message: "Item not found." });
    return;
  }

  res.json({ item });
}

async function createItem(req, res) {
  const isEmergency = ["true", "1", "yes", "on"].includes(String(req.body.isEmergency || "").toLowerCase());
  const item = await createItemRecord({
    title: req.body.title,
    description: req.body.description,
    department: req.body.department || "",
    itemType: req.body.itemType,
    priceType: req.body.priceType,
    priceValue: req.body.priceValue,
    imageUrl: req.file ? `/uploads/${req.file.filename}` : "",
    isEmergency,
    ownerId: req.user.id || req.user._id?.toString()
  });
  res.status(201).json({
    message: isEmergency
      ? "Emergency need posted successfully. It is now visible to other students."
      : "Item submitted successfully. It will be visible to other students after admin approval.",
    item
  });
}

function listLostFound(req, res) {
  res.json({ posts: demoStore.listLostFound() });
}

function createLostFound(req, res) {
  const post = demoStore.createLostFound({
    title: req.body.title,
    description: req.body.description,
    postType: req.body.postType,
    location: req.body.location,
    contact: req.body.contact,
    ownerId: req.user.id
  });
  res.status(201).json({ message: "Lost and found post created.", post });
}

async function deleteItem(req, res) {
  const result = await deleteItemRecord(
    req.params.id,
    req.user.id || req.user._id?.toString(),
    isAdminUser(req.user)
  );
  if (result.error) {
    res.status(result.error.includes("not found") ? 404 : 403).json({ message: result.error });
    return;
  }

  res.json({ message: "Item deleted successfully." });
}

module.exports = { createItem, createLostFound, deleteItem, getItem, listItems, listLostFound };
