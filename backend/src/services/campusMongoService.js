const fs = require("fs");
const path = require("path");
const {
  AcademicResource,
  Answer,
  Bookmark,
  ChatBlock,
  ChatReport,
  ChatThread,
  ClubAnnouncement,
  ClubMembership,
  ClubOpenCall,
  ClubRequest,
  Doubt,
  Match,
  Friendship,
  FriendRequest,
  ItemListing,
  Message,
  Opportunity,
  ProjectIdea,
  ProjectIdeaReply,
  QuickSportFormation,
  Club,
  Player,
  Team,
  User
} = require("../models");
const { toPublicUser } = require("./userService");

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function asId(value) {
  return value ? String(value) : "";
}

function sortParticipants(participantIds) {
  return [...participantIds].map(String).sort();
}

function matchesParticipants(thread, participantIds) {
  const left = sortParticipants(thread.participantIds || []);
  const right = sortParticipants(participantIds || []);
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function deleteUploadedFile(fileUrl) {
  if (!fileUrl || !fileUrl.startsWith("/uploads/")) {
    return;
  }

  const absolutePath = path.resolve(__dirname, "../../uploads", fileUrl.replace("/uploads/", ""));
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
}

async function loadUsersByIds(ids) {
  const normalizedIds = [...new Set(ids.map(asId).filter(Boolean))];
  const users = await User.find({ _id: { $in: normalizedIds } });
  return new Map(users.map((user) => [asId(user._id), user]));
}

async function findGlobalChat() {
  let thread = await ChatThread.findOne({ contextType: "global", contextId: "chat-global" });
  if (!thread) {
    thread = await ChatThread.create({
      title: "Global Chat",
      participantIds: [],
      contextType: "global",
      contextId: "chat-global"
    });
  }
  return thread;
}

async function listResources({ type, department, difficulty, search, userId, includePending }) {
  const query = {};
  const andConditions = [];
  if (type) {
    query.type = type;
  }
  if (department) {
    query.department = department;
  }
  if (difficulty) {
    query.difficulty = difficulty;
  }
  if (search) {
    const safe = new RegExp(escapeRegex(search), "i");
    andConditions.push({ $or: [{ title: safe }, { description: safe }, { subject: safe }, { category: safe }] });
  }

  if (!includePending) {
    andConditions.push(userId ? { $or: [{ status: "approved" }, { uploaderId: asId(userId) }] } : { status: "approved" });
  }

  if (andConditions.length) {
    query.$and = andConditions;
  }

  const resources = await AcademicResource.find(query).sort({ createdAt: -1 });
  const uploaderMap = await loadUsersByIds(resources.map((resource) => resource.uploaderId));
  const bookmarks = userId
    ? await Bookmark.find({ userId: asId(userId), resourceType: "resource", resourceId: { $in: resources.map((entry) => asId(entry._id)) } })
    : [];
  const bookmarkedIds = new Set(bookmarks.map((entry) => entry.resourceId));

  return resources.map((resource) => ({
    id: asId(resource._id),
    type: resource.type,
    title: resource.title,
    description: resource.description,
    department: resource.department,
    subject: resource.subject,
    category: resource.category,
    difficulty: resource.difficulty,
    fileType: resource.fileType,
    fileUrl: resource.fileUrl,
    externalUrl: resource.externalUrl,
    uploaderId: resource.uploaderId,
    status: resource.status,
    createdAt: resource.createdAt,
    uploader: toPublicUser(uploaderMap.get(asId(resource.uploaderId))),
    bookmarked: bookmarkedIds.has(asId(resource._id))
  }));
}

async function getResourceById(resourceId, userId, includePending = false) {
  const resource = await AcademicResource.findById(resourceId);
  if (!resource) {
    return null;
  }

  if (!includePending && resource.status !== "approved" && asId(resource.uploaderId) !== asId(userId)) {
    return null;
  }

  const [uploader, bookmark] = await Promise.all([
    resource.uploaderId ? User.findById(resource.uploaderId) : null,
    userId ? Bookmark.findOne({ userId: asId(userId), resourceType: "resource", resourceId: asId(resource._id) }) : null
  ]);

  return {
    id: asId(resource._id),
    type: resource.type,
    title: resource.title,
    description: resource.description,
    department: resource.department,
    subject: resource.subject,
    category: resource.category,
    difficulty: resource.difficulty,
    fileType: resource.fileType,
    fileUrl: resource.fileUrl,
    externalUrl: resource.externalUrl,
    uploaderId: resource.uploaderId,
    status: resource.status,
    createdAt: resource.createdAt,
    uploader: toPublicUser(uploader),
    bookmarked: Boolean(bookmark)
  };
}

async function createResource(payload) {
  const resource = await AcademicResource.create({
    ...payload,
    status: "pending"
  });
  return getResourceById(resource._id, payload.uploaderId, true);
}

async function toggleBookmark(userId, resourceId) {
  const existing = await Bookmark.findOne({
    userId: asId(userId),
    resourceType: "resource",
    resourceId: asId(resourceId)
  });

  if (existing) {
    await existing.deleteOne();
    return { bookmarked: false };
  }

  await Bookmark.create({
    userId: asId(userId),
    resourceType: "resource",
    resourceId: asId(resourceId)
  });
  return { bookmarked: true };
}

async function listBookmarks(userId) {
  const bookmarks = await Bookmark.find({ userId: asId(userId) }).sort({ createdAt: -1 });
  const resourceIds = bookmarks.filter((entry) => entry.resourceType === "resource").map((entry) => entry.resourceId);
  const resources = await AcademicResource.find({ _id: { $in: resourceIds } });
  const resourceMap = new Map(resources.map((entry) => [asId(entry._id), entry]));

  return bookmarks
    .map((bookmark) => {
      if (bookmark.resourceType === "resource") {
        const resource = resourceMap.get(asId(bookmark.resourceId));
        if (!resource) {
          return null;
        }

        return {
          type: "resource",
          item: {
            id: asId(resource._id),
            title: resource.title,
            description: resource.description,
            fileUrl: resource.fileUrl,
            externalUrl: resource.externalUrl
          }
        };
      }

      return null;
    })
    .filter(Boolean);
}

async function deleteResource(resourceId, userId, isAdmin) {
  const resource = await AcademicResource.findById(resourceId);
  if (!resource) {
    return { error: "Resource not found." };
  }

  if (!isAdmin && asId(resource.uploaderId) !== asId(userId)) {
    return { error: "Only the uploader can delete this note." };
  }

  const shareThreads = await ChatThread.find({ contextType: "resource-share", contextId: asId(resource._id) });
  const shareThreadIds = shareThreads.map((thread) => asId(thread._id));
  await Promise.all([
    Bookmark.deleteMany({ resourceType: "resource", resourceId: asId(resource._id) }),
    ChatThread.deleteMany({ _id: { $in: shareThreadIds } }),
    Message.deleteMany({ threadId: { $in: shareThreadIds } }),
    resource.deleteOne()
  ]);
  deleteUploadedFile(resource.fileUrl);
  return { deleted: true };
}

async function listItems({ department, itemType, search, userId, includePending }) {
  const query = {};
  const andConditions = [];
  if (department) {
    query.department = department;
  }
  if (itemType) {
    query.itemType = itemType;
  }
  if (search) {
    const safe = new RegExp(escapeRegex(search), "i");
    andConditions.push({ $or: [{ title: safe }, { description: safe }] });
  }
  if (!includePending) {
    andConditions.push({ status: "approved" });
  }

  if (andConditions.length) {
    query.$and = andConditions;
  }

  const items = await ItemListing.find(query).sort({ createdAt: -1 });
  const ownerMap = await loadUsersByIds(items.map((item) => item.ownerId));
  return items.map((item) => ({
    id: asId(item._id),
    title: item.title,
    description: item.description,
    department: item.department,
    itemType: item.itemType,
    priceType: item.priceType,
    priceValue: item.priceValue,
    imageUrl: item.imageUrl,
    isEmergency: Boolean(item.isEmergency),
    status: item.status,
    ownerId: item.ownerId,
    createdAt: item.createdAt,
    owner: toPublicUser(ownerMap.get(asId(item.ownerId)))
  }));
}

async function getItemById(itemId, userId, includePending = false) {
  const item = await ItemListing.findById(itemId);
  if (!item) {
    return null;
  }

  if (!includePending && item.status !== "approved" && asId(item.ownerId) !== asId(userId)) {
    return null;
  }

  const owner = item.ownerId ? await User.findById(item.ownerId) : null;
  return {
    id: asId(item._id),
    title: item.title,
    description: item.description,
    department: item.department,
    itemType: item.itemType,
    priceType: item.priceType,
    priceValue: item.priceValue,
    imageUrl: item.imageUrl,
    isEmergency: Boolean(item.isEmergency),
    status: item.status,
    ownerId: item.ownerId,
    createdAt: item.createdAt,
    owner: toPublicUser(owner)
  };
}

async function createItem(payload) {
  const item = await ItemListing.create({
    ...payload,
    isEmergency: Boolean(payload.isEmergency),
    status: payload.isEmergency ? "approved" : "pending"
  });
  return getItemById(item._id, payload.ownerId, true);
}

async function deleteItem(itemId, userId, isAdmin) {
  const item = await ItemListing.findById(itemId);
  if (!item) {
    return { error: "Item not found." };
  }

  if (!isAdmin && asId(item.ownerId) !== asId(userId)) {
    return { error: "Only the owner can delete this item." };
  }

  const itemThreads = await ChatThread.find({ contextType: "item", contextId: asId(item._id) });
  const threadIds = itemThreads.map((thread) => asId(thread._id));
  await Promise.all([
    ChatThread.deleteMany({ _id: { $in: threadIds } }),
    Message.deleteMany({ threadId: { $in: threadIds } }),
    item.deleteOne()
  ]);
  deleteUploadedFile(item.imageUrl);
  return { deleted: true };
}

async function listDoubts({ department, subject, search }) {
  const query = {};
  if (department) {
    query.department = department;
  }
  if (subject) {
    query.subject = subject;
  }
  if (search) {
    const safe = new RegExp(escapeRegex(search), "i");
    query.$or = [{ title: safe }, { description: safe }, { subject: safe }];
  }

  const doubts = await Doubt.find(query).sort({ createdAt: -1 });
  const doubtIds = doubts.map((doubt) => asId(doubt._id));
  const answers = doubtIds.length ? await Answer.find({ doubtId: { $in: doubtIds } }).sort({ createdAt: -1 }) : [];
  const userMap = await loadUsersByIds([
    ...doubts.map((doubt) => doubt.authorId),
    ...answers.map((answer) => answer.authorId)
  ]);
  const answersByDoubt = new Map();

  answers.forEach((answer) => {
    const doubtId = asId(answer.doubtId);
    if (!answersByDoubt.has(doubtId)) {
      answersByDoubt.set(doubtId, []);
    }
    answersByDoubt.get(doubtId).push({
      id: asId(answer._id),
      doubtId: answer.doubtId,
      content: answer.content,
      authorId: answer.authorId,
      upvotes: answer.upvotes || 0,
      upvotedBy: answer.upvotedBy || [],
      createdAt: answer.createdAt,
      user: toPublicUser(userMap.get(asId(answer.authorId)))
    });
  });

  return doubts.map((doubt) => ({
    id: asId(doubt._id),
    title: doubt.title,
    description: doubt.description,
    department: doubt.department,
    subject: doubt.subject,
    imageUrl: doubt.imageUrl,
    status: doubt.status,
    authorId: doubt.authorId,
    createdAt: doubt.createdAt,
    user: toPublicUser(userMap.get(asId(doubt.authorId))),
    answers: answersByDoubt.get(asId(doubt._id)) || []
  }));
}

async function getDoubtById(doubtId) {
  const doubt = await Doubt.findById(doubtId);
  if (!doubt) {
    return null;
  }

  const [author, answers] = await Promise.all([
    doubt.authorId ? User.findById(doubt.authorId) : null,
    Answer.find({ doubtId: asId(doubt._id) }).sort({ createdAt: -1 })
  ]);
  const answerUserMap = await loadUsersByIds(answers.map((answer) => answer.authorId));

  return {
    id: asId(doubt._id),
    title: doubt.title,
    description: doubt.description,
    department: doubt.department,
    subject: doubt.subject,
    imageUrl: doubt.imageUrl,
    status: doubt.status,
    authorId: doubt.authorId,
    createdAt: doubt.createdAt,
    user: toPublicUser(author),
    answers: answers.map((answer) => ({
      id: asId(answer._id),
      doubtId: answer.doubtId,
      content: answer.content,
      authorId: answer.authorId,
      upvotes: answer.upvotes || 0,
      upvotedBy: answer.upvotedBy || [],
      createdAt: answer.createdAt,
      user: toPublicUser(answerUserMap.get(asId(answer.authorId)))
    }))
  };
}

async function createDoubt(payload) {
  const doubt = await Doubt.create({
    ...payload,
    status: "open"
  });
  return getDoubtById(doubt._id);
}

async function addDoubtAnswer(doubtId, payload) {
  const doubt = await Doubt.findById(doubtId);
  if (!doubt) {
    return null;
  }

  const answer = await Answer.create({
    doubtId: asId(doubtId),
    content: payload.content,
    authorId: payload.authorId,
    upvotes: 0,
    upvotedBy: []
  });
  const author = payload.authorId ? await User.findById(payload.authorId) : null;
  return {
    id: asId(answer._id),
    doubtId: answer.doubtId,
    content: answer.content,
    authorId: answer.authorId,
    upvotes: answer.upvotes,
    upvotedBy: answer.upvotedBy,
    createdAt: answer.createdAt,
    user: toPublicUser(author)
  };
}

async function upvoteDoubtAnswer(answerId, userId) {
  const answer = await Answer.findById(answerId);
  if (!answer) {
    return null;
  }

  if (!(answer.upvotedBy || []).includes(asId(userId))) {
    answer.upvotedBy = [...(answer.upvotedBy || []), asId(userId)];
    answer.upvotes = Number(answer.upvotes || 0) + 1;
    await answer.save();
  }

  const author = answer.authorId ? await User.findById(answer.authorId) : null;
  return {
    id: asId(answer._id),
    doubtId: answer.doubtId,
    content: answer.content,
    authorId: answer.authorId,
    upvotes: answer.upvotes,
    upvotedBy: answer.upvotedBy,
    createdAt: answer.createdAt,
    user: toPublicUser(author)
  };
}

async function listProjectIdeas({ search } = {}) {
  const query = {};
  if (search) {
    const safe = new RegExp(escapeRegex(search), "i");
    query.$or = [{ title: safe }, { description: safe }];
  }

  const ideas = await ProjectIdea.find(query).sort({ createdAt: -1 });
  const ideaIds = ideas.map((idea) => asId(idea._id));
  const replies = ideaIds.length
    ? await ProjectIdeaReply.find({ projectIdeaId: { $in: ideaIds } }).sort({ createdAt: 1 })
    : [];
  const userMap = await loadUsersByIds([
    ...ideas.map((idea) => idea.authorId),
    ...replies.map((reply) => reply.authorId)
  ]);
  const repliesByIdea = new Map();

  replies.forEach((reply) => {
    const ideaId = asId(reply.projectIdeaId);
    if (!repliesByIdea.has(ideaId)) {
      repliesByIdea.set(ideaId, []);
    }
    repliesByIdea.get(ideaId).push({
      id: asId(reply._id),
      projectIdeaId: reply.projectIdeaId,
      content: reply.content,
      authorId: reply.authorId,
      createdAt: reply.createdAt,
      user: toPublicUser(userMap.get(asId(reply.authorId)))
    });
  });

  return ideas.map((idea) => ({
    id: asId(idea._id),
    title: idea.title,
    description: idea.description,
    authorId: idea.authorId,
    createdAt: idea.createdAt,
    user: toPublicUser(userMap.get(asId(idea.authorId))),
    replies: repliesByIdea.get(asId(idea._id)) || []
  }));
}

async function getProjectIdeaById(projectIdeaId) {
  const idea = await ProjectIdea.findById(projectIdeaId);
  if (!idea) {
    return null;
  }

  const [author, replies] = await Promise.all([
    idea.authorId ? User.findById(idea.authorId) : null,
    ProjectIdeaReply.find({ projectIdeaId: asId(idea._id) }).sort({ createdAt: 1 })
  ]);
  const replyUsers = await loadUsersByIds(replies.map((reply) => reply.authorId));

  return {
    id: asId(idea._id),
    title: idea.title,
    description: idea.description,
    authorId: idea.authorId,
    createdAt: idea.createdAt,
    user: toPublicUser(author),
    replies: replies.map((reply) => ({
      id: asId(reply._id),
      projectIdeaId: reply.projectIdeaId,
      content: reply.content,
      authorId: reply.authorId,
      createdAt: reply.createdAt,
      user: toPublicUser(replyUsers.get(asId(reply.authorId)))
    }))
  };
}

async function createProjectIdea(payload) {
  const idea = await ProjectIdea.create({
    title: payload.title,
    description: payload.description,
    authorId: payload.authorId
  });
  return getProjectIdeaById(idea._id);
}

async function addProjectIdeaReply(projectIdeaId, payload) {
  const idea = await ProjectIdea.findById(projectIdeaId);
  if (!idea) {
    return null;
  }

  const reply = await ProjectIdeaReply.create({
    projectIdeaId: asId(projectIdeaId),
    content: payload.content,
    authorId: payload.authorId
  });
  const author = payload.authorId ? await User.findById(payload.authorId) : null;
  return {
    id: asId(reply._id),
    projectIdeaId: reply.projectIdeaId,
    content: reply.content,
    authorId: reply.authorId,
    createdAt: reply.createdAt,
    user: toPublicUser(author)
  };
}

async function ensureThread({ title, participantIds, contextType, contextId, itemTitle, resourceTitle }) {
  const existingThreads = await ChatThread.find({ contextType, contextId });
  let thread = existingThreads.find((entry) => matchesParticipants(entry, participantIds));
  if (!thread) {
    thread = await ChatThread.create({
      title,
      participantIds: sortParticipants(participantIds),
      contextType,
      contextId,
      itemTitle,
      resourceTitle
    });
  }
  return thread;
}

async function ensureClubThread(club) {
  const participantIds = await ClubMembership.find({ clubId: asId(club._id) }).distinct("userId");
  let thread = await ChatThread.findOne({ contextType: "club", contextId: asId(club._id) });
  if (!thread) {
    thread = await ChatThread.create({
      title: `${club.name} Club Group`,
      participantIds: sortParticipants(participantIds),
      contextType: "club",
      contextId: asId(club._id)
    });
  } else if (!matchesParticipants(thread, participantIds)) {
    thread.participantIds = sortParticipants(participantIds);
    thread.title = `${club.name} Club Group`;
    await thread.save();
  }

  return thread;
}

function computeOpenCallStatus(openCall) {
  const now = Date.now();
  const opensAt = new Date(openCall.opensAt).getTime();
  const closesAt = new Date(openCall.closesAt).getTime();
  if (Number.isNaN(opensAt) || Number.isNaN(closesAt)) {
    return openCall.status || "scheduled";
  }
  if (now < opensAt) {
    return "scheduled";
  }
  if (now > closesAt) {
    return "closed";
  }
  return "live";
}

async function enrichMessages(messages) {
  const userMap = await loadUsersByIds(messages.map((message) => message.senderId));
  return messages.map((message) => ({
    id: asId(message._id),
    threadId: message.threadId,
    senderId: message.senderId,
    senderName: message.senderName,
    text: message.text,
    createdAt: message.createdAt,
    sender: toPublicUser(userMap.get(asId(message.senderId))) || (message.senderName ? { name: message.senderName } : null)
  }));
}

async function mapThread(thread, userId) {
  const [lastMessageDoc, blocked, participantUsers] = await Promise.all([
    Message.findOne({ threadId: asId(thread._id) }).sort({ createdAt: -1 }),
    ChatBlock.findOne({ threadId: asId(thread._id) }),
    thread.contextType === "admin" ? loadUsersByIds(thread.participantIds || []) : Promise.resolve(new Map())
  ]);
  const lastMessage = lastMessageDoc ? (await enrichMessages([lastMessageDoc]))[0] : null;
  let title = thread.title;

  if (thread.contextType === "admin") {
    const currentViewer = toPublicUser(participantUsers.get(asId(userId)));
    if (currentViewer?.isAdmin) {
      const otherParticipant = toPublicUser(
        participantUsers.get((thread.participantIds || []).find((id) => asId(id) !== asId(userId)))
      );
      title = otherParticipant?.name || otherParticipant?.registerNumber || "Student";
    } else {
      title = "DM with Admin";
    }
  }

  return {
    id: asId(thread._id),
    title,
    participantIds: thread.participantIds || [],
    contextType: thread.contextType,
    contextId: thread.contextId,
    itemTitle: thread.itemTitle,
    resourceTitle: thread.resourceTitle,
    lastMessage,
    blocked: blocked
      ? {
          id: asId(blocked._id),
          threadId: blocked.threadId,
          blockerId: blocked.blockerId,
          blockedUserId: blocked.blockedUserId,
          createdAt: blocked.createdAt
        }
      : null,
    canAccess: thread.contextType === "global" || (thread.participantIds || []).includes(asId(userId))
  };
}

async function listChatsForUser(userId) {
  await findGlobalChat();
  const threads = await ChatThread.find({
    $or: [{ contextType: "global" }, { participantIds: asId(userId) }]
  }).sort({ updatedAt: -1, createdAt: -1 });
  const mapped = await Promise.all(threads.map((thread) => mapThread(thread, userId)));
  return mapped.filter((thread) => thread.canAccess);
}

async function getChatForUser(threadId, userId) {
  const thread = await ChatThread.findById(threadId);
  if (!thread) {
    return null;
  }
  const mapped = await mapThread(thread, userId);
  return mapped.canAccess ? mapped : null;
}

async function listMessagesForChat(threadId) {
  const messages = await Message.find({ threadId: asId(threadId) }).sort({ createdAt: 1 });
  return enrichMessages(messages);
}

async function createMessageForChat(threadId, payload) {
  const message = await Message.create({
    threadId: asId(threadId),
    senderId: asId(payload.senderId),
    senderName: payload.senderName,
    text: payload.text
  });
  await ChatThread.updateOne({ _id: threadId }, { $currentDate: { updatedAt: true } });
  const [enriched] = await enrichMessages([message]);
  return enriched;
}

async function deleteMessageForChat(threadId, messageId, requesterId) {
  const message = await Message.findOne({ _id: messageId, threadId: asId(threadId) });
  if (!message) {
    return null;
  }

  if (asId(message.senderId) !== asId(requesterId)) {
    return false;
  }

  await Message.deleteOne({ _id: messageId });
  await ChatThread.updateOne({ _id: threadId }, { $currentDate: { updatedAt: true } });
  return {
    id: asId(message._id),
    threadId: message.threadId,
    deletedFor: "everyone"
  };
}

async function ensureItemChat({ itemId, requesterId, requesterName }) {
  const item = await ItemListing.findById(itemId);
  if (!item) {
    return null;
  }

  const owner = item.ownerId ? await User.findById(item.ownerId) : null;
  const thread = await ensureThread({
    title: requesterId === item.ownerId ? `${item.title} Owner Room` : `${item.title} Inquiry with ${owner?.name || "Owner"}`,
    participantIds: [item.ownerId, asId(requesterId)],
    contextType: "item",
    contextId: asId(item._id),
    itemTitle: item.title
  });

  const existingMessages = await Message.countDocuments({ threadId: asId(thread._id) });
  if (!existingMessages && asId(requesterId) !== asId(item.ownerId)) {
    await createMessageForChat(thread._id, {
      senderId: requesterId,
      senderName: requesterName,
      text: `Hi, I am interested in "${item.title}". Is it still available?`
    });
  }

  return getChatForUser(thread._id, requesterId);
}

async function ensureDoubtChat({ doubtId, requesterId, requesterName }) {
  const doubt = await Doubt.findById(doubtId);
  if (!doubt) {
    return null;
  }

  const author = doubt.authorId ? await User.findById(doubt.authorId) : null;
  const thread = await ensureThread({
    title: requesterId === doubt.authorId ? `${doubt.title} Discussion Room` : `${doubt.title} with ${author?.name || "Student"}`,
    participantIds: [doubt.authorId, asId(requesterId)],
    contextType: "doubt",
    contextId: asId(doubt._id)
  });

  const existingMessages = await Message.countDocuments({ threadId: asId(thread._id) });
  if (!existingMessages && asId(requesterId) !== asId(doubt.authorId)) {
    await createMessageForChat(thread._id, {
      senderId: requesterId,
      senderName: requesterName,
      text: `Hi, I saw your doubt "${doubt.title}". I think I can help.`
    });
  }

  return getChatForUser(thread._id, requesterId);
}

async function ensureProjectIdeaChat({ ideaId, requesterId, requesterName }) {
  const idea = await ProjectIdea.findById(ideaId);
  if (!idea) {
    return null;
  }

  const author = idea.authorId ? await User.findById(idea.authorId) : null;
  const thread = await ensureThread({
    title:
      requesterId === idea.authorId
        ? `${idea.title} Discussion Room`
        : `${idea.title} with ${author?.name || "Student"}`,
    participantIds: [idea.authorId, asId(requesterId)],
    contextType: "projectIdea",
    contextId: asId(idea._id)
  });

  const existingMessages = await Message.countDocuments({ threadId: asId(thread._id) });
  if (!existingMessages && asId(requesterId) !== asId(idea.authorId)) {
    await createMessageForChat(thread._id, {
      senderId: requesterId,
      senderName: requesterName,
      text: `Hi, I am interested in your project idea "${idea.title}".`
    });
  }

  return getChatForUser(thread._id, requesterId);
}

async function ensureQuickSportChat({ quickSportId, requesterId, requesterName }) {
  const quickSport = await QuickSportFormation.findById(quickSportId);
  if (!quickSport) {
    return null;
  }

  const thread = await ensureThread({
    title:
      asId(requesterId) === asId(quickSport.authorId)
        ? `${quickSport.sportName} Quick Team Room`
        : `${quickSport.sportName} Quick Team with ${quickSport.authorName || "Student"}`,
    participantIds: [quickSport.authorId, asId(requesterId)],
    contextType: "quickSport",
    contextId: asId(quickSport._id)
  });

  const existingMessages = await Message.countDocuments({ threadId: asId(thread._id) });
  if (!existingMessages && asId(requesterId) !== asId(quickSport.authorId)) {
    await createMessageForChat(thread._id, {
      senderId: requesterId,
      senderName: requesterName,
      text: `Hi, I want to join your quick ${quickSport.sportName} team at ${quickSport.location || "the location you shared"}.`
    });
  }

  return getChatForUser(thread._id, requesterId);
}

async function ensureFriendChat({ userId, userName, friendId, friendName }) {
  const friendship = await Friendship.findOne({ userIds: { $all: [asId(userId), asId(friendId)] } });
  if (!friendship) {
    return null;
  }

  const thread = await ensureThread({
    title: `${friendName || "Student"} Direct Message`,
    participantIds: [asId(userId), asId(friendId)],
    contextType: "friend",
    contextId: sortParticipants([userId, friendId]).join(":")
  });

  const existingMessages = await Message.countDocuments({ threadId: asId(thread._id) });
  if (!existingMessages) {
    await createMessageForChat(thread._id, {
      senderId: userId,
      senderName: userName,
      text: `Hi ${friendName || "there"}, we are connected now. Let's chat here.`
    });
  }

  return getChatForUser(thread._id, userId);
}

async function ensureAdminChat({ userId, userName, adminId, adminName, initialMessage }) {
  const thread = await ensureThread({
    title: "DM with Admin",
    participantIds: [asId(userId), asId(adminId)],
    contextType: "admin",
    contextId: sortParticipants([userId, adminId]).join(":")
  });

  const existingMessages = await Message.countDocuments({ threadId: asId(thread._id) });
  if (!existingMessages && asId(userId) !== asId(adminId)) {
    await createMessageForChat(thread._id, {
      senderId: userId,
      senderName: userName,
      text: initialMessage || `Hi ${adminName || "Admin"}, I need help regarding Campus Connect.`
    });
  }

  return getChatForUser(thread._id, userId);
}

async function ensureResourceShareChat({
  resourceId,
  resourceTitle,
  resourceUrl,
  senderId,
  senderName,
  recipientId,
  recipientName
}) {
  const thread = await ensureThread({
    title: `${resourceTitle} Shared With ${recipientName || "Friend"}`,
    participantIds: [asId(senderId), asId(recipientId)],
    contextType: "resource-share",
    contextId: asId(resourceId),
    resourceTitle
  });

  await createMessageForChat(thread._id, {
    senderId,
    senderName,
    text: `I shared the note "${resourceTitle}" with you. Download here: ${resourceUrl}`
  });

  return getChatForUser(thread._id, senderId);
}

async function blockChat(threadId, blockerId) {
  const thread = await ChatThread.findById(threadId);
  if (!thread || thread.contextType !== "friend" || !(thread.participantIds || []).includes(asId(blockerId))) {
    return null;
  }

  const existing = await ChatBlock.findOne({ threadId: asId(thread._id) });
  if (existing) {
    return {
      id: asId(existing._id),
      threadId: existing.threadId,
      blockerId: existing.blockerId,
      blockedUserId: existing.blockedUserId,
      createdAt: existing.createdAt
    };
  }

  const blockedUserId = (thread.participantIds || []).find((entry) => asId(entry) !== asId(blockerId));
  const block = await ChatBlock.create({
    threadId: asId(thread._id),
    blockerId: asId(blockerId),
    blockedUserId: asId(blockedUserId)
  });
  return {
    id: asId(block._id),
    threadId: block.threadId,
    blockerId: block.blockerId,
    blockedUserId: block.blockedUserId,
    createdAt: block.createdAt
  };
}

async function reportChat(threadId, reporterId, reason) {
  const thread = await ChatThread.findById(threadId);
  if (!thread || thread.contextType !== "friend" || !(thread.participantIds || []).includes(asId(reporterId))) {
    return null;
  }

  let report = await ChatReport.findOne({
    threadId: asId(thread._id),
    reporterId: asId(reporterId),
    status: "pending"
  });
  if (!report) {
    report = await ChatReport.create({
      threadId: asId(thread._id),
      reporterId: asId(reporterId),
      reason: reason || "Reported conversation"
    });
  }
  return {
    id: asId(report._id),
    threadId: report.threadId,
    reporterId: report.reporterId,
    reason: report.reason,
    status: report.status,
    createdAt: report.createdAt
  };
}

async function sendFriendRequest(senderId, recipientId) {
  if (asId(senderId) === asId(recipientId)) {
    return { error: "You cannot send a friend request to yourself." };
  }

  const existingFriendship = await Friendship.findOne({ userIds: { $all: [asId(senderId), asId(recipientId)] } });
  if (existingFriendship) {
    return { error: "You are already friends." };
  }

  const existingPending = await FriendRequest.findOne({
    status: "pending",
    $or: [
      { senderId: asId(senderId), recipientId: asId(recipientId) },
      { senderId: asId(recipientId), recipientId: asId(senderId) }
    ]
  });
  if (existingPending) {
    return { error: "A pending friend request already exists." };
  }

  const request = await FriendRequest.create({
    senderId: asId(senderId),
    recipientId: asId(recipientId),
    status: "pending"
  });
  return {
    request: {
      id: asId(request._id),
      senderId: request.senderId,
      recipientId: request.recipientId,
      status: request.status,
      createdAt: request.createdAt
    }
  };
}

async function acceptFriendRequest(requestId, recipientId) {
  const request = await FriendRequest.findById(requestId);
  if (!request || request.status !== "pending") {
    return { error: "Friend request not found." };
  }
  if (asId(request.recipientId) !== asId(recipientId)) {
    return { error: "Only the recipient can accept this request." };
  }

  request.status = "accepted";
  await request.save();

  const userIds = sortParticipants([request.senderId, request.recipientId]);
  const existingFriendship = await Friendship.findOne({ userIds: { $all: userIds } });
  if (!existingFriendship) {
    await Friendship.create({ userIds });
  }

  return {
    request: {
      id: asId(request._id),
      senderId: request.senderId,
      recipientId: request.recipientId,
      status: request.status,
      createdAt: request.createdAt
    }
  };
}

async function getFriendNetwork(userId) {
  const [friendships, incoming, outgoing] = await Promise.all([
    Friendship.find({ userIds: asId(userId) }).sort({ createdAt: -1 }),
    FriendRequest.find({ recipientId: asId(userId), status: "pending" }).sort({ createdAt: -1 }),
    FriendRequest.find({ senderId: asId(userId), status: "pending" }).sort({ createdAt: -1 })
  ]);

  const friendIds = friendships.map((entry) => entry.userIds.find((id) => asId(id) !== asId(userId))).filter(Boolean);
  const users = await loadUsersByIds([
    ...friendIds,
    ...incoming.map((entry) => entry.senderId),
    ...outgoing.map((entry) => entry.recipientId)
  ]);

  return {
    followersCount: friendIds.length,
    followingCount: friendIds.length,
    friendsCount: friendIds.length,
    friends: friendIds.map((id) => toPublicUser(users.get(asId(id)))).filter(Boolean),
    incoming: incoming.map((request) => ({
      id: asId(request._id),
      senderId: request.senderId,
      recipientId: request.recipientId,
      status: request.status,
      createdAt: request.createdAt,
      sender: toPublicUser(users.get(asId(request.senderId)))
    })),
    outgoing: outgoing.map((request) => ({
      id: asId(request._id),
      senderId: request.senderId,
      recipientId: request.recipientId,
      status: request.status,
      createdAt: request.createdAt,
      recipient: toPublicUser(users.get(asId(request.recipientId)))
    }))
  };
}

async function listAdminInbox(adminId) {
  const threads = await ChatThread.find({
    contextType: "admin",
    participantIds: asId(adminId)
  }).sort({ updatedAt: -1, createdAt: -1 });
  return Promise.all(threads.map((thread) => mapThread(thread, adminId)));
}

async function listPendingChatReports() {
  const reports = await ChatReport.find({ status: "pending" }).sort({ createdAt: -1 });
  const threads = await ChatThread.find({ _id: { $in: reports.map((entry) => entry.threadId) } });
  const threadMap = new Map(threads.map((thread) => [asId(thread._id), thread]));
  return reports.map((report) => ({
    id: asId(report._id),
    threadId: report.threadId,
    reporterId: report.reporterId,
    reason: report.reason,
    status: report.status,
    createdAt: report.createdAt,
    thread: threadMap.get(asId(report.threadId))
      ? {
          id: asId(threadMap.get(asId(report.threadId))._id),
          title: threadMap.get(asId(report.threadId)).title
        }
      : null
  }));
}

async function moderateEntity(moduleName, entityId, status) {
  if (moduleName === "resource") {
    const entity = await AcademicResource.findByIdAndUpdate(entityId, { status }, { new: true });
    return entity ? { id: asId(entity._id), status: entity.status } : null;
  }

  if (moduleName === "item") {
    const entity = await ItemListing.findByIdAndUpdate(entityId, { status }, { new: true });
    return entity ? { id: asId(entity._id), status: entity.status } : null;
  }

  if (moduleName === "report") {
    const entity = await ChatReport.findByIdAndUpdate(entityId, { status }, { new: true });
    return entity ? { id: asId(entity._id), status: entity.status } : null;
  }

  if (moduleName === "sportRequest") {
    const entity = await ClubRequest.findByIdAndUpdate(entityId, { status }, { new: true });
    return entity ? { id: asId(entity._id), status: entity.status } : null;
  }

  if (moduleName === "clubRequest") {
    const entity = await ClubRequest.findByIdAndUpdate(entityId, { status }, { new: true });
    return entity ? { id: asId(entity._id), status: entity.status } : null;
  }

  return null;
}

async function listClubs(moduleType = "sports", userId = "") {
  const query = moduleType
    ? moduleType === "sports"
      ? { $or: [{ moduleType: "sports" }, { moduleType: { $exists: false } }] }
      : { moduleType }
    : {};
  const clubs = await Club.find(query).sort({ createdAt: -1 });
  const teams = await Team.find({ clubId: { $in: clubs.map((club) => asId(club._id)) } }).sort({ createdAt: -1 });
  const memberships = await ClubMembership.find({ clubId: { $in: clubs.map((club) => asId(club._id)) } });
  const openCalls = await ClubOpenCall.find({ clubId: { $in: clubs.map((club) => asId(club._id)) } }).sort({ createdAt: -1 });
  const teamsByClubId = new Map();
  const membershipsByClubId = new Map();
  const openCallsByClubId = new Map();

  teams.forEach((team) => {
    const clubId = asId(team.clubId);
    const current = teamsByClubId.get(clubId) || [];
    current.push({
      id: asId(team._id),
      clubId: asId(team.clubId),
      name: team.name,
      description: team.description,
      captain: team.captain,
      recruiting: team.recruiting
    });
    teamsByClubId.set(clubId, current);
  });

  memberships.forEach((membership) => {
    const clubId = asId(membership.clubId);
    const current = membershipsByClubId.get(clubId) || [];
    current.push(membership);
    membershipsByClubId.set(clubId, current);
  });

  openCalls.forEach((openCall) => {
    const clubId = asId(openCall.clubId);
    const current = openCallsByClubId.get(clubId) || [];
    current.push(openCall);
    openCallsByClubId.set(clubId, current);
  });

  return clubs.map((club) => ({
    ...(function deriveAccess() {
      const clubMemberships = membershipsByClubId.get(asId(club._id)) || [];
      const viewerMembership = clubMemberships.find((membership) => asId(membership.userId) === asId(userId));
      const latestOpenCall = (openCallsByClubId.get(asId(club._id)) || [])
        .map((entry) => ({
          id: asId(entry._id),
          title: entry.title,
          description: entry.description,
          opensAt: entry.opensAt,
          closesAt: entry.closesAt,
          status: computeOpenCallStatus(entry)
        }))
        .sort((left, right) => new Date(right.opensAt).getTime() - new Date(left.opensAt).getTime())[0] || null;

      return {
        viewerRole: viewerMembership?.role || (asId(club.ownerId) === asId(userId) ? "head" : ""),
        canAccess: Boolean(viewerMembership) || asId(club.ownerId) === asId(userId),
        canJoin: Boolean(latestOpenCall && latestOpenCall.status === "live" && !viewerMembership && asId(club.ownerId) !== asId(userId)),
        latestOpenCall,
        memberCount: clubMemberships.length
      };
    })(),
    id: asId(club._id),
    name: club.name,
    description: club.description,
    moduleType: club.moduleType || "sports",
    recruiting: Boolean(club.recruiting),
    coverColor: club.coverColor,
    achievements: club.achievements || [],
    logoUrl: club.logoUrl || "",
    ownerId: club.ownerId || "",
    ownerName: club.ownerName || "",
    ownerRegisterNumber: club.ownerRegisterNumber || "",
    ownerDepartment: club.ownerDepartment || "",
    ownerCollegeEmail: club.ownerCollegeEmail || "",
    createdFromRequestId: club.createdFromRequestId || "",
    teams: teamsByClubId.get(asId(club._id)) || []
  }));
}

async function getClub(clubId) {
  const club = await Club.findById(clubId);
  if (!club) {
    return null;
  }

  const [teams, players, matches, memberships, openCalls, announcements, memberUsers] = await Promise.all([
    Team.find({ clubId: asId(club._id) }).sort({ createdAt: -1 }),
    Player.find({ teamId: { $in: (await Team.find({ clubId: asId(club._id) }).distinct("_id")).map(asId) } }).sort({ createdAt: -1 }),
    Match.find({ teamId: { $in: (await Team.find({ clubId: asId(club._id) }).distinct("_id")).map(asId) } }).sort({ createdAt: -1 }),
    ClubMembership.find({ clubId: asId(club._id) }).sort({ createdAt: 1 }),
    ClubOpenCall.find({ clubId: asId(club._id) }).sort({ createdAt: -1 }),
    ClubAnnouncement.find({ clubId: asId(club._id) }).sort({ createdAt: -1 }),
    loadUsersByIds((await ClubMembership.find({ clubId: asId(club._id) }).distinct("userId")).map(asId))
  ]);

  return {
    id: asId(club._id),
    name: club.name,
    description: club.description,
    recruiting: Boolean(club.recruiting),
    coverColor: club.coverColor,
    achievements: club.achievements || [],
    logoUrl: club.logoUrl || "",
    ownerId: club.ownerId || "",
    ownerName: club.ownerName || "",
    ownerRegisterNumber: club.ownerRegisterNumber || "",
    ownerDepartment: club.ownerDepartment || "",
    ownerCollegeEmail: club.ownerCollegeEmail || "",
    createdFromRequestId: club.createdFromRequestId || "",
    announcements: announcements.map((announcement) => ({
      id: asId(announcement._id),
      clubId: announcement.clubId,
      authorId: announcement.authorId,
      authorName: announcement.authorName,
      title: announcement.title,
      description: announcement.description,
      createdAt: announcement.createdAt
    })),
    openCalls: openCalls.map((openCall) => ({
      id: asId(openCall._id),
      title: openCall.title,
      description: openCall.description,
      opensAt: openCall.opensAt,
      closesAt: openCall.closesAt,
      status: computeOpenCallStatus(openCall),
      createdBy: openCall.createdBy,
      createdAt: openCall.createdAt
    })),
    members: memberships.map((membership) => ({
      id: asId(membership._id),
      userId: membership.userId,
      role: membership.role,
      joinedAt: membership.createdAt,
      user: toPublicUser(memberUsers.get(asId(membership.userId)))
    })),
    teams: teams.map((team) => ({
      id: asId(team._id),
      clubId: asId(team.clubId),
      name: team.name,
      description: team.description,
      captain: team.captain,
      recruiting: team.recruiting,
      players: players.filter((player) => asId(player.teamId) === asId(team._id)).map((player) => ({
        id: asId(player._id),
        name: player.name,
        department: player.department,
        year: player.year,
        photoUrl: player.photoUrl,
        achievements: player.achievements || []
      })),
      matches: matches.filter((match) => asId(match.teamId) === asId(team._id)).map((match) => ({
        id: asId(match._id),
        teamId: asId(match.teamId),
        opponent: match.opponent,
        result: match.result,
        fixtureDate: match.fixtureDate,
        score: match.score,
        mvp: match.mvp
      }))
    }))
  };
}

async function getTeam(teamId) {
  const team = await Team.findById(teamId);
  if (!team) {
    return null;
  }

  const [club, players, matches] = await Promise.all([
    Club.findById(team.clubId),
    Player.find({ teamId: asId(team._id) }).sort({ createdAt: -1 }),
    Match.find({ teamId: asId(team._id) }).sort({ createdAt: -1 })
  ]);

  return {
    id: asId(team._id),
    clubId: asId(team.clubId),
    name: team.name,
    description: team.description,
    captain: team.captain,
    recruiting: team.recruiting,
    club: club
      ? {
          id: asId(club._id),
          name: club.name,
          description: club.description,
          recruiting: Boolean(club.recruiting),
          coverColor: club.coverColor,
          achievements: club.achievements || []
        }
      : null,
    players: players.map((player) => ({
      id: asId(player._id),
      name: player.name,
      department: player.department,
      year: player.year,
      photoUrl: player.photoUrl,
      achievements: player.achievements || []
    })),
    matches: matches.map((match) => ({
      id: asId(match._id),
      teamId: asId(match.teamId),
      opponent: match.opponent,
      result: match.result,
      fixtureDate: match.fixtureDate,
      score: match.score,
      mvp: match.mvp
    }))
  };
}

async function getClubRoom(clubId, userId) {
  const club = await getClub(clubId);
  if (!club) {
    return null;
  }

  const membership = await ClubMembership.findOne({ clubId: asId(clubId), userId: asId(userId) });
  const isHead = asId(club.ownerId) === asId(userId) || membership?.role === "head";
  if (!membership && !isHead) {
    return { accessDenied: true, club };
  }

  const clubDoc = await Club.findById(clubId);
  const chatThread = clubDoc ? await ensureClubThread(clubDoc) : null;
  return {
    club,
    membership: membership
      ? {
          id: asId(membership._id),
          clubId: membership.clubId,
          userId: membership.userId,
          role: membership.role,
          joinedAt: membership.createdAt
        }
      : {
          clubId: asId(clubId),
          userId: asId(userId),
          role: "head",
          joinedAt: club.createdAt
        },
    isHead,
    chat: chatThread ? await mapThread(chatThread, userId) : null
  };
}

async function createClubOpenCall(clubId, userId, payload) {
  const club = await Club.findById(clubId);
  if (!club || asId(club.ownerId) !== asId(userId)) {
    return null;
  }

  const opensAt = new Date(payload.opensAt);
  const closesAt = new Date(payload.closesAt);
  if (Number.isNaN(opensAt.getTime()) || Number.isNaN(closesAt.getTime()) || closesAt <= opensAt) {
    return { error: "Please provide a valid open call date and time range." };
  }

  const openCall = await ClubOpenCall.create({
    clubId: asId(clubId),
    title: payload.title,
    description: payload.description,
    opensAt,
    closesAt,
    createdBy: asId(userId),
    status: "scheduled"
  });

  return {
    id: asId(openCall._id),
    clubId: openCall.clubId,
    title: openCall.title,
    description: openCall.description,
    opensAt: openCall.opensAt,
    closesAt: openCall.closesAt,
    status: computeOpenCallStatus(openCall),
    createdBy: openCall.createdBy,
    createdAt: openCall.createdAt
  };
}

async function joinClubViaOpenCall(clubId, userId) {
  const club = await Club.findById(clubId);
  if (!club) {
    return { error: "Club not found." };
  }

  if (asId(club.ownerId) === asId(userId)) {
    return { error: "The club head already has access." };
  }

  const existingMembership = await ClubMembership.findOne({ clubId: asId(clubId), userId: asId(userId) });
  if (existingMembership) {
    return {
      membership: {
        id: asId(existingMembership._id),
        clubId: existingMembership.clubId,
        userId: existingMembership.userId,
        role: existingMembership.role,
        joinedAt: existingMembership.createdAt
      }
    };
  }

  const openCalls = await ClubOpenCall.find({ clubId: asId(clubId) }).sort({ createdAt: -1 });
  const activeOpenCall = openCalls.find((entry) => computeOpenCallStatus(entry) === "live");
  if (!activeOpenCall) {
    return { error: "This club is not open for joining right now." };
  }

  const membership = await ClubMembership.create({
    clubId: asId(clubId),
    userId: asId(userId),
    role: "member"
  });

  const thread = await ensureClubThread(club);
  return {
    membership: {
      id: asId(membership._id),
      clubId: membership.clubId,
      userId: membership.userId,
      role: membership.role,
      joinedAt: membership.createdAt
    },
    chat: await mapThread(thread, userId)
  };
}

async function createClubAnnouncement(clubId, userId, payload, authorName) {
  const club = await Club.findById(clubId);
  if (!club || asId(club.ownerId) !== asId(userId)) {
    return null;
  }

  const announcement = await ClubAnnouncement.create({
    clubId: asId(clubId),
    authorId: asId(userId),
    authorName,
    title: payload.title,
    description: payload.description
  });

  const thread = await ensureClubThread(club);
  await createMessageForChat(thread._id, {
    senderId: asId(userId),
    senderName: authorName,
    text: `Club Announcement: ${payload.title}\n${payload.description}`
  });

  return {
    id: asId(announcement._id),
    clubId: announcement.clubId,
    authorId: announcement.authorId,
    authorName: announcement.authorName,
    title: announcement.title,
    description: announcement.description,
    createdAt: announcement.createdAt
  };
}

async function listMatches() {
  const matches = await Match.find().sort({ createdAt: -1 });
  return matches.map((match) => ({
    id: asId(match._id),
    teamId: asId(match.teamId),
    opponent: match.opponent,
    result: match.result,
    fixtureDate: match.fixtureDate,
    score: match.score,
    mvp: match.mvp
  }));
}

async function createClub(payload) {
  const club = await Club.create({
    name: payload.name,
    description: payload.description,
    moduleType: payload.moduleType || "sports",
    recruiting: Boolean(payload.recruiting),
    coverColor: payload.coverColor,
    achievements: payload.achievements || [],
    logoUrl: payload.logoUrl || "",
    ownerId: payload.ownerId || "",
    ownerName: payload.ownerName || "",
    ownerRegisterNumber: payload.ownerRegisterNumber || "",
    ownerDepartment: payload.ownerDepartment || "",
    ownerCollegeEmail: payload.ownerCollegeEmail || "",
    createdFromRequestId: payload.createdFromRequestId || ""
  });

  if (payload.moduleType === "club" && payload.ownerId) {
    await ClubMembership.updateOne(
      { clubId: asId(club._id), userId: asId(payload.ownerId) },
      { $setOnInsert: { role: "head" } },
      { upsert: true }
    );
    await ensureClubThread(club);
  }

  return {
    id: asId(club._id),
    name: club.name,
    description: club.description,
    moduleType: club.moduleType || "sports",
    recruiting: Boolean(club.recruiting),
    coverColor: club.coverColor,
    achievements: club.achievements || [],
    logoUrl: club.logoUrl || "",
    ownerId: club.ownerId || "",
    ownerName: club.ownerName || "",
    ownerRegisterNumber: club.ownerRegisterNumber || "",
    ownerDepartment: club.ownerDepartment || "",
    ownerCollegeEmail: club.ownerCollegeEmail || "",
    createdFromRequestId: club.createdFromRequestId || "",
    teams: []
  };
}

async function createClubRequest(payload) {
  const request = await ClubRequest.create({
    requesterId: payload.requesterId,
    requestType: payload.requestType || "club",
    clubName: payload.clubName,
    clubHead: payload.clubHead,
    registerNumber: payload.registerNumber,
    department: payload.department,
    phone: payload.phone,
    collegeEmail: payload.collegeEmail,
    description: payload.description,
    passportPhotoUrl: payload.passportPhotoUrl || "",
    collegeIdCardUrl: payload.collegeIdCardUrl || "",
    clubLogoUrl: payload.clubLogoUrl || "",
    clubHeadProofUrl: payload.clubHeadProofUrl || "",
    sportHeadProofUrl: payload.sportHeadProofUrl || "",
    status: payload.status || "pending",
    createdClubId: payload.createdClubId || ""
  });

  return {
    id: asId(request._id),
    requesterId: request.requesterId,
    requestType: request.requestType || "club",
    clubName: request.clubName,
    clubHead: request.clubHead,
    registerNumber: request.registerNumber,
    department: request.department,
    phone: request.phone,
    collegeEmail: request.collegeEmail,
    description: request.description,
    passportPhotoUrl: request.passportPhotoUrl,
    collegeIdCardUrl: request.collegeIdCardUrl,
    clubLogoUrl: request.clubLogoUrl,
    clubHeadProofUrl: request.clubHeadProofUrl,
    sportHeadProofUrl: request.sportHeadProofUrl,
    status: request.status,
    createdClubId: request.createdClubId,
    createdAt: request.createdAt
  };
}

async function listClubRequests() {
  const requests = await ClubRequest.find().sort({ createdAt: -1 });
  const users = await loadUsersByIds(requests.map((entry) => entry.requesterId));

  return requests.map((request) => ({
    id: asId(request._id),
    requesterId: request.requesterId,
    requestType: request.requestType || "club",
    clubName: request.clubName,
    clubHead: request.clubHead,
    registerNumber: request.registerNumber,
    department: request.department,
    phone: request.phone,
    collegeEmail: request.collegeEmail,
    description: request.description,
    passportPhotoUrl: request.passportPhotoUrl,
    collegeIdCardUrl: request.collegeIdCardUrl,
    clubLogoUrl: request.clubLogoUrl,
    clubHeadProofUrl: request.clubHeadProofUrl,
    sportHeadProofUrl: request.sportHeadProofUrl,
    status: request.status,
    createdClubId: request.createdClubId,
    createdAt: request.createdAt,
    requester: toPublicUser(users.get(asId(request.requesterId)))
  }));
}

async function getClubRequestById(requestId) {
  const request = await ClubRequest.findById(requestId);
  if (!request) {
    return null;
  }

  const requester = request.requesterId ? await User.findById(request.requesterId) : null;
  return {
    id: asId(request._id),
    requesterId: request.requesterId,
    requestType: request.requestType || "club",
    clubName: request.clubName,
    clubHead: request.clubHead,
    registerNumber: request.registerNumber,
    department: request.department,
    phone: request.phone,
    collegeEmail: request.collegeEmail,
    description: request.description,
    passportPhotoUrl: request.passportPhotoUrl,
    collegeIdCardUrl: request.collegeIdCardUrl,
    clubLogoUrl: request.clubLogoUrl,
    clubHeadProofUrl: request.clubHeadProofUrl,
    sportHeadProofUrl: request.sportHeadProofUrl,
    status: request.status,
    createdClubId: request.createdClubId,
    createdAt: request.createdAt,
    requester: toPublicUser(requester)
  };
}

async function createClubFromRequest(requestId, payload) {
  const request = await ClubRequest.findById(requestId);
  if (!request) {
    return null;
  }

  const club = await Club.create({
    name: payload.name || request.clubName,
    description: payload.description || request.description,
    moduleType: payload.moduleType || (request.requestType === "sport" ? "sports" : "club"),
    recruiting: Boolean(payload.recruiting),
    coverColor: payload.coverColor,
    achievements: payload.achievements || [],
    logoUrl: payload.logoUrl || request.clubLogoUrl || "",
    ownerId: request.requesterId || "",
    ownerName: request.clubHead || "",
    ownerRegisterNumber: request.registerNumber || "",
    ownerDepartment: request.department || "",
    ownerCollegeEmail: request.collegeEmail || "",
    createdFromRequestId: asId(request._id)
  });

  request.status = "created";
  request.createdClubId = asId(club._id);
  await request.save();
  await ClubMembership.updateOne(
    { clubId: asId(club._id), userId: request.requesterId || "" },
    { $setOnInsert: { role: "head" } },
    { upsert: true }
  );
  await ensureClubThread(club);

  return {
    club: {
      id: asId(club._id),
      name: club.name,
      description: club.description,
      moduleType: club.moduleType || "club",
      recruiting: Boolean(club.recruiting),
      coverColor: club.coverColor,
      achievements: club.achievements || [],
      logoUrl: club.logoUrl || "",
      ownerId: club.ownerId || "",
      ownerName: club.ownerName || "",
      ownerRegisterNumber: club.ownerRegisterNumber || "",
      ownerDepartment: club.ownerDepartment || "",
      ownerCollegeEmail: club.ownerCollegeEmail || "",
      createdFromRequestId: club.createdFromRequestId || "",
      teams: []
    },
    request: {
      id: asId(request._id),
      status: request.status,
      createdClubId: request.createdClubId
    }
  };
}

async function deleteClub(clubId) {
  const club = await Club.findById(clubId);
  if (!club) {
    return null;
  }

  await Promise.all([
    Team.deleteMany({ clubId: asId(clubId) }),
    ClubMembership.deleteMany({ clubId: asId(clubId) }),
    ClubOpenCall.deleteMany({ clubId: asId(clubId) }),
    ClubAnnouncement.deleteMany({ clubId: asId(clubId) }),
    ChatThread.deleteMany({ contextType: "club", contextId: asId(clubId) })
  ]);

  if (club.createdFromRequestId) {
    await ClubRequest.findByIdAndUpdate(club.createdFromRequestId, {
      status: "pending",
      createdClubId: ""
    });
  }

  await Club.deleteOne({ _id: clubId });

  return {
    id: asId(club._id),
    name: club.name,
    moduleType: club.moduleType || "club"
  };
}

async function listQuickSportFormations(viewerId = "") {
  const formations = await QuickSportFormation.find().sort({ playAt: 1, createdAt: -1 });
  return formations.map((entry) => ({
    id: asId(entry._id),
    sportName: entry.sportName,
    description: entry.description || "",
    playAt: entry.playAt,
    location: entry.location || "",
    playersNeeded: Number(entry.playersNeeded || 0),
    authorId: entry.authorId || "",
    authorName: entry.authorName || "",
    authorRegisterNumber: entry.authorRegisterNumber || "",
    authorDepartment: entry.authorDepartment || "",
    canMessage: viewerId ? asId(entry.authorId) !== asId(viewerId) : false,
    canDelete: viewerId ? asId(entry.authorId) === asId(viewerId) : false,
    createdAt: entry.createdAt
  }));
}

async function createQuickSportFormation(payload) {
  const entry = await QuickSportFormation.create({
    sportName: payload.sportName,
    description: payload.description || "",
    playAt: payload.playAt,
    location: payload.location || "",
    playersNeeded: Number(payload.playersNeeded || 0),
    authorId: payload.authorId || "",
    authorName: payload.authorName || "",
    authorRegisterNumber: payload.authorRegisterNumber || "",
    authorDepartment: payload.authorDepartment || ""
  });

  return {
    id: asId(entry._id),
    sportName: entry.sportName,
    description: entry.description || "",
    playAt: entry.playAt,
    location: entry.location || "",
    playersNeeded: Number(entry.playersNeeded || 0),
    authorId: entry.authorId || "",
    authorName: entry.authorName || "",
    authorRegisterNumber: entry.authorRegisterNumber || "",
    authorDepartment: entry.authorDepartment || "",
    createdAt: entry.createdAt
  };
}

async function deleteQuickSportFormation(entryId, requesterId, isAdmin = false) {
  const entry = await QuickSportFormation.findById(entryId);
  if (!entry) {
    return null;
  }

  if (!isAdmin && asId(entry.authorId) !== asId(requesterId)) {
    return false;
  }

  await Promise.all([
    ChatThread.deleteMany({ contextType: "quickSport", contextId: asId(entryId) }),
    QuickSportFormation.deleteOne({ _id: entryId })
  ]);

  return {
    id: asId(entry._id),
    sportName: entry.sportName
  };
}

async function getDashboardSummary(userId) {
  const [resourcesCount, itemsCount, opportunitiesCount, clubsCount, latestResources, latestItems] = await Promise.all([
    AcademicResource.countDocuments({ status: "approved" }),
    ItemListing.countDocuments({ status: "approved" }),
    Opportunity.countDocuments(),
    Club.countDocuments(),
    listResources({ type: "notes", userId, includePending: false }),
    listItems({ userId, includePending: false })
  ]);

  return {
    counts: {
      resources: resourcesCount,
      items: itemsCount,
      opportunities: opportunitiesCount,
      clubs: clubsCount
    },
    recentActivity: [
      ...latestResources.slice(0, 1).map((item) => ({
        title: `${item.title} uploaded`,
        description: item.description
      })),
      ...latestItems.slice(0, 1).map((item) => ({
        title: `${item.title} listed`,
        description: item.description
      }))
    ]
  };
}

module.exports = {
  acceptFriendRequest,
  addProjectIdeaReply,
  blockChat,
  createDoubt,
  createProjectIdea,
  addDoubtAnswer,
  createItem,
  createClub,
  createClubAnnouncement,
  createClubFromRequest,
  createClubOpenCall,
  createClubRequest,
  createMessageForChat,
  deleteMessageForChat,
  createQuickSportFormation,
  createResource,
  deleteClub,
  deleteItem,
  deleteQuickSportFormation,
  deleteResource,
  ensureAdminChat,
  ensureDoubtChat,
  ensureFriendChat,
  ensureItemChat,
  ensureProjectIdeaChat,
  ensureQuickSportChat,
  ensureResourceShareChat,
  getChatForUser,
  getDoubtById,
  getClubRequestById,
  getClubRoom,
  getDashboardSummary,
  getFriendNetwork,
  getItemById,
  getProjectIdeaById,
  getResourceById,
  listAdminInbox,
  listClubRequests,
  listBookmarks,
  listClubs,
  listChatsForUser,
  listDoubts,
  listItems,
  listMatches,
  listMessagesForChat,
  listPendingChatReports,
  listProjectIdeas,
  listQuickSportFormations,
  listResources,
  joinClubViaOpenCall,
  getClub,
  getTeam,
  moderateEntity,
  reportChat,
  sendFriendRequest,
  toggleBookmark,
  upvoteDoubtAnswer
};
