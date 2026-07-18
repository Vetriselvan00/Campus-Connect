const { acceptFriendRequest: acceptRequestRecord, getFriendNetwork, sendFriendRequest: sendRequestRecord } = require("../services/campusMongoService");
const { findUserById } = require("../services/userService");

async function getNetwork(req, res) {
  const userId = req.user.id || req.user._id?.toString();
  const network = await getFriendNetwork(userId);
  res.json({ network });
}

async function sendFriendRequest(req, res) {
  const senderId = req.user.id || req.user._id?.toString();
  const recipient = await findUserById(req.body.recipientId);
  if (!recipient) {
    res.status(404).json({ message: "Student not found." });
    return;
  }

  const result = await sendRequestRecord(senderId, recipient.id || recipient._id?.toString());
  if (result.error) {
    res.status(400).json({ message: result.error });
    return;
  }

  res.status(201).json({ message: `Friend request sent to ${recipient.name}.`, request: result.request });
}

async function acceptFriendRequest(req, res) {
  const recipientId = req.user.id || req.user._id?.toString();
  const result = await acceptRequestRecord(req.params.id, recipientId);
  if (result.error) {
    res.status(400).json({ message: result.error });
    return;
  }

  res.json({ message: "Friend request accepted.", request: result.request });
}

module.exports = { acceptFriendRequest, getNetwork, sendFriendRequest };
