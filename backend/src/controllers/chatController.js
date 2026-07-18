const {
  blockChat: blockChatRecord,
  createMessageForChat,
  deleteMessageForChat,
  ensureAdminChat,
  ensureDoubtChat,
  ensureFriendChat,
  ensureItemChat,
  ensureProjectIdeaChat,
  ensureQuickSportChat,
  getChatForUser,
  listChatsForUser,
  listMessagesForChat,
  reportChat: reportChatRecord
} = require("../services/campusMongoService");
const { findAdminUser, findUserById, toPublicUser } = require("../services/userService");

async function listChats(req, res) {
  const chats = await listChatsForUser(req.user.id || req.user._id?.toString());
  res.json({ chats });
}

async function listMessages(req, res) {
  const userId = req.user.id || req.user._id?.toString();
  const chat = await getChatForUser(req.params.id, userId);
  if (!chat) {
    res.status(403).json({ message: "You can only access your own chats." });
    return;
  }

  const messages = await listMessagesForChat(req.params.id);
  res.json({ messages, chat, blocked: chat.blocked });
}

async function createMessage(req, res) {
  const userId = req.user.id || req.user._id?.toString();
  const chat = await getChatForUser(req.params.id, userId);
  if (!chat) {
    res.status(403).json({ message: "You can only message inside your own chats." });
    return;
  }

  if (chat.blocked) {
    res.status(403).json({ message: "This conversation is blocked." });
    return;
  }

  const message = await createMessageForChat(req.params.id, {
    senderId: userId,
    senderName: req.user.name,
    text: req.body.text
  });
  res.status(201).json({ message: "Message sent.", data: message });
}

async function deleteMessage(req, res) {
  const userId = req.user.id || req.user._id?.toString();
  const chat = await getChatForUser(req.params.id, userId);
  if (!chat) {
    res.status(403).json({ message: "You can only delete messages inside your own chats." });
    return;
  }

  const deleted = await deleteMessageForChat(req.params.id, req.params.messageId, userId);
  if (deleted === false) {
    res.status(403).json({ message: "You can delete only your own messages." });
    return;
  }
  if (!deleted) {
    res.status(404).json({ message: "Message not found." });
    return;
  }

  res.json({ message: "Message deleted for everyone.", deleted });
}

async function startItemChat(req, res) {
  const userId = req.user.id || req.user._id?.toString();
  const chat = await ensureItemChat({
    itemId: req.params.itemId,
    requesterId: userId,
    requesterName: req.user.name
  });

  if (!chat) {
    res.status(404).json({ message: "Item chat could not be created." });
    return;
  }

  res.status(201).json({ message: "Private item chat ready.", chat });
}

async function startDoubtChat(req, res) {
  const userId = req.user.id || req.user._id?.toString();
  const chat = await ensureDoubtChat({
    doubtId: req.params.doubtId,
    requesterId: userId,
    requesterName: req.user.name
  });

  if (!chat) {
    res.status(404).json({ message: "Doubt chat could not be created." });
    return;
  }

  res.status(201).json({ message: "Private doubt chat ready.", chat });
}

async function startProjectIdeaChat(req, res) {
  const userId = req.user.id || req.user._id?.toString();
  const chat = await ensureProjectIdeaChat({
    ideaId: req.params.ideaId,
    requesterId: userId,
    requesterName: req.user.name
  });

  if (!chat) {
    res.status(404).json({ message: "Project idea chat could not be created." });
    return;
  }

  res.status(201).json({ message: "Project idea chat ready.", chat });
}

async function startFriendChat(req, res) {
  const userId = req.user.id || req.user._id?.toString();
  const friend = await findUserById(req.params.friendId);
  if (!friend) {
    res.status(404).json({ message: "Friend not found." });
    return;
  }

  const friendId = friend.id || friend._id?.toString();
  const chat = await ensureFriendChat({
    userId,
    userName: req.user.name,
    friendId,
    friendName: friend.name
  });

  if (!chat) {
    res.status(403).json({ message: "Only accepted friends can start private messages." });
    return;
  }

  res.status(201).json({ message: "Private friend chat ready.", chat, friend: toPublicUser(friend) });
}

async function startQuickSportChat(req, res) {
  const userId = req.user.id || req.user._id?.toString();
  const chat = await ensureQuickSportChat({
    quickSportId: req.params.quickSportId,
    requesterId: userId,
    requesterName: req.user.name
  });

  if (!chat) {
    res.status(404).json({ message: "Quick team chat could not be created." });
    return;
  }

  res.status(201).json({ message: "Quick team chat ready.", chat });
}

async function startAdminChat(req, res) {
  const userId = req.user.id || req.user._id?.toString();
  const admin = await findAdminUser();
  if (!admin) {
    res.status(404).json({ message: "Admin account was not found." });
    return;
  }

  const chat = await ensureAdminChat({
    userId,
    userName: req.user.name,
    adminId: admin.id || admin._id?.toString(),
    adminName: admin.name
  });

  res.status(201).json({ message: "Admin direct message ready.", chat, admin: toPublicUser(admin) });
}

async function startAdminStudentChat(req, res) {
  const admin = await findAdminUser();
  if (!admin) {
    res.status(404).json({ message: "Admin account was not found." });
    return;
  }

  const adminId = admin.id || admin._id?.toString();
  const requesterId = req.user.id || req.user._id?.toString();
  if (adminId !== requesterId) {
    res.status(403).json({ message: "Admin access only." });
    return;
  }

  const student = await findUserById(req.params.userId);
  if (!student) {
    res.status(404).json({ message: "Student not found." });
    return;
  }

  const studentId = student.id || student._id?.toString();
  if (studentId === adminId) {
    res.status(400).json({ message: "Use the normal admin chat for your own account." });
    return;
  }

  const chat = await ensureAdminChat({
    userId: adminId,
    userName: req.user.name,
    adminId: studentId,
    adminName: student.name,
    initialMessage: `Hello ${student.name || "Student"}, this is the Campus Connect admin team.`
  });

  res.status(201).json({ message: "Student direct message ready.", chat, student: toPublicUser(student) });
}

async function blockChat(req, res) {
  const userId = req.user.id || req.user._id?.toString();
  const block = await blockChatRecord(req.params.id, userId);
  if (!block) {
    res.status(400).json({ message: "This chat cannot be blocked." });
    return;
  }

  res.json({ message: "Conversation blocked.", block });
}

async function reportChat(req, res) {
  const userId = req.user.id || req.user._id?.toString();
  const report = await reportChatRecord(req.params.id, userId, req.body.reason);
  if (!report) {
    res.status(400).json({ message: "This chat cannot be reported." });
    return;
  }

  res.status(201).json({ message: "Chat reported to admin.", report });
}

module.exports = {
  blockChat,
  createMessage,
  deleteMessage,
  listChats,
  listMessages,
  reportChat,
  startAdminChat,
  startAdminStudentChat,
  startDoubtChat,
  startFriendChat,
  startQuickSportChat,
  startProjectIdeaChat,
  startItemChat
};
