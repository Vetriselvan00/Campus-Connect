const { clone } = require("../utils/clone");
const { seedData } = require("../seeds/seedData");

const state = clone(seedData);
state.friendRequests = state.friendRequests || [];
state.friendships = state.friendships || [];
state.chatBlocks = state.chatBlocks || [];
state.chatReports = state.chatReports || [];
const counters = {};

function nextId(prefix) {
  counters[prefix] = (counters[prefix] || 0) + 1;
  return `${prefix}-${Date.now()}-${counters[prefix]}`;
}

function sortByCreatedAt(items) {
  return [...items].sort((left, right) => {
    const leftTime = new Date(left.createdAt || 0).getTime();
    const rightTime = new Date(right.createdAt || 0).getTime();
    return rightTime - leftTime;
  });
}

function publicUser(user) {
  if (!user) {
    return null;
  }

  const { passwordHash, role, ...safeUser } = user;
  safeUser.registerNumber = safeUser.registerNumber || safeUser.collegeEmail?.split("@")[0] || "";
  safeUser.memberTag = safeUser.memberTag || "Campus Member";
  safeUser.isAdmin = String(user.collegeEmail || "").toLowerCase() === "2023000001@student.annauniv.edu";
  return safeUser;
}

function withUser(item, users, userKey = "authorId") {
  const user = users.find((entry) => entry.id === item[userKey]);
  return { ...item, user: publicUser(user) };
}

const demoStore = {
  getUsers() {
    return state.users.map(publicUser);
  },

  findUserById(userId) {
    return state.users.find((user) => user.id === userId) || null;
  },

  findUserByEmail(email) {
    return (
      state.users.find(
        (user) => user.collegeEmail.toLowerCase() === String(email || "").trim().toLowerCase()
      ) || null
    );
  },

  createUser(payload) {
    const user = {
      id: nextId("user"),
      memberTag: payload.memberTag || "Campus Member",
      about: payload.about || "",
      createdAt: new Date().toISOString(),
      ...payload
    };
    state.users.unshift(user);
    return publicUser(user);
  },

  updateUser(userId, updates) {
    const user = state.users.find((entry) => entry.id === userId);
    if (!user) {
      return null;
    }

    Object.assign(user, updates);
    return publicUser(user);
  },

  searchUsersByAcademicId(query, currentUserId) {
    const normalized = String(query || "").trim().toLowerCase();
    return state.users
      .filter((user) => user.id !== currentUserId)
      .filter((user) => {
        const registerNumber = String(user.registerNumber || user.collegeEmail?.split("@")[0] || "").toLowerCase();
        const name = String(user.name || "").toLowerCase();
        return name.includes(normalized) || registerNumber.includes(normalized);
      })
      .slice(0, 8)
      .map(publicUser);
  },

  listResources(filters = {}) {
    return sortByCreatedAt(state.resources)
      .filter((resource) => !filters.type || resource.type === filters.type)
      .filter((resource) => filters.includePending || resource.status === "approved")
      .filter((resource) => !filters.department || resource.department === filters.department)
      .filter((resource) => !filters.difficulty || resource.difficulty === filters.difficulty)
      .filter((resource) =>
        !filters.search
          ? true
          : `${resource.title} ${resource.subject} ${resource.description}`
              .toLowerCase()
              .includes(String(filters.search).toLowerCase())
      )
      .map((resource) => ({
        ...resource,
        uploader: publicUser(this.findUserById(resource.uploaderId)),
        bookmarked: Boolean(
          filters.userId &&
            state.bookmarks.find(
              (bookmark) =>
                bookmark.userId === filters.userId &&
                bookmark.resourceType === "resource" &&
                bookmark.resourceId === resource.id
            )
        )
      }));
  },

  getResource(resourceId, userId) {
    const resource = state.resources.find((entry) => entry.id === resourceId);
    if (!resource) {
      return null;
    }

    return {
      ...resource,
      uploader: publicUser(this.findUserById(resource.uploaderId)),
      bookmarked: Boolean(
        userId &&
          state.bookmarks.find(
            (bookmark) =>
              bookmark.userId === userId &&
              bookmark.resourceType === "resource" &&
              bookmark.resourceId === resource.id
          )
      )
    };
  },

  createResource(payload) {
    const resource = {
      id: nextId("resource"),
      createdAt: new Date().toISOString(),
      status: "pending",
      ...payload
    };
    state.resources.unshift(resource);
    return this.getResource(resource.id, payload.uploaderId);
  },

  toggleBookmark(userId, resourceId) {
    const existingIndex = state.bookmarks.findIndex(
      (bookmark) =>
        bookmark.userId === userId &&
        bookmark.resourceType === "resource" &&
        bookmark.resourceId === resourceId
    );

    if (existingIndex >= 0) {
      state.bookmarks.splice(existingIndex, 1);
      return { bookmarked: false };
    }

    state.bookmarks.unshift({
      id: nextId("bookmark"),
      userId,
      resourceType: "resource",
      resourceId
    });
    return { bookmarked: true };
  },

  listDoubts(filters = {}) {
    return sortByCreatedAt(state.doubts)
      .filter((doubt) => !filters.department || doubt.department === filters.department)
      .filter((doubt) => !filters.subject || doubt.subject === filters.subject)
      .filter((doubt) =>
        !filters.search
          ? true
          : `${doubt.title} ${doubt.description}`.toLowerCase().includes(String(filters.search).toLowerCase())
      )
      .map((doubt) => ({
        ...withUser(doubt, state.users),
        answers: sortByCreatedAt(state.answers.filter((answer) => answer.doubtId === doubt.id)).map((answer) =>
          withUser(answer, state.users)
        )
      }));
  },

  getDoubt(doubtId) {
    return this.listDoubts().find((doubt) => doubt.id === doubtId) || null;
  },

  createDoubt(payload) {
    const doubt = {
      id: nextId("doubt"),
      createdAt: new Date().toISOString(),
      status: "open",
      ...payload
    };
    state.doubts.unshift(doubt);
    return this.getDoubt(doubt.id);
  },

  addAnswer(doubtId, payload) {
    const answer = {
      id: nextId("answer"),
      doubtId,
      createdAt: new Date().toISOString(),
      upvotes: 0,
      upvotedBy: [],
      ...payload
    };
    state.answers.unshift(answer);
    return withUser(answer, state.users);
  },

  upvoteAnswer(answerId, userId) {
    const answer = state.answers.find((entry) => entry.id === answerId);
    if (!answer) {
      return null;
    }

    if (!answer.upvotedBy.includes(userId)) {
      answer.upvotedBy.push(userId);
      answer.upvotes += 1;
    }

    return withUser(answer, state.users);
  },

  listItems(filters = {}) {
    return sortByCreatedAt(state.items)
      .filter((item) => filters.includePending || item.status === "approved")
      .filter((item) => !filters.department || item.department === filters.department)
      .filter((item) => !filters.itemType || item.itemType === filters.itemType)
      .filter((item) =>
        !filters.search
          ? true
          : `${item.title} ${item.description}`.toLowerCase().includes(String(filters.search).toLowerCase())
      )
      .map((item) => ({ ...item, owner: publicUser(this.findUserById(item.ownerId)) }));
  },

  getItem(itemId) {
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item) {
      return null;
    }

    return { ...item, owner: publicUser(this.findUserById(item.ownerId)) };
  },

  createItem(payload) {
    const item = {
      id: nextId("item"),
      createdAt: new Date().toISOString(),
      status: payload.status || "pending",
      ...payload
    };
    state.items.unshift(item);
    return this.getItem(item.id);
  },

  listLostFound() {
    return sortByCreatedAt(state.lostFound).map((entry) => ({
      ...entry,
      owner: publicUser(this.findUserById(entry.ownerId))
    }));
  },

  createLostFound(payload) {
    const post = {
      id: nextId("lostfound"),
      createdAt: new Date().toISOString(),
      status: "open",
      ...payload
    };
    state.lostFound.unshift(post);
    return post;
  },

  listAnnouncements() {
    return sortByCreatedAt(state.announcements).map((entry) => ({
      ...entry,
      author: publicUser(this.findUserById(entry.authorId)) || (entry.authorName ? { name: entry.authorName } : null)
    }));
  },

  createAnnouncement(payload) {
    const announcement = {
      id: nextId("announcement"),
      createdAt: new Date().toISOString(),
      ...payload
    };
    state.announcements.unshift(announcement);
    return announcement;
  },

  listOpportunities() {
    return sortByCreatedAt(state.opportunities).map((entry) => ({
      ...entry,
      author: publicUser(this.findUserById(entry.authorId))
    }));
  },

  createOpportunity(payload) {
    const opportunity = {
      id: nextId("opportunity"),
      createdAt: new Date().toISOString(),
      applicants: [],
      ...payload
    };
    state.opportunities.unshift(opportunity);
    return opportunity;
  },

  applyToOpportunity(opportunityId, userId) {
    const opportunity = state.opportunities.find((entry) => entry.id === opportunityId);
    if (!opportunity) {
      return null;
    }

    if (!opportunity.applicants.includes(userId)) {
      opportunity.applicants.push(userId);
    }

    return opportunity;
  },

  listClubs() {
    return state.clubs.map((club) => ({
      ...club,
      teams: state.teams.filter((team) => team.clubId === club.id)
    }));
  },

  getClub(clubId) {
    const club = state.clubs.find((entry) => entry.id === clubId);
    if (!club) {
      return null;
    }

    const teams = state.teams
      .filter((team) => team.clubId === club.id)
      .map((team) => ({
        ...team,
        players: state.players.filter((player) => player.teamId === team.id),
        matches: state.matches.filter((match) => match.teamId === team.id)
      }));

    return { ...club, teams };
  },

  getTeam(teamId) {
    const team = state.teams.find((entry) => entry.id === teamId) || state.teams[0];
    if (!team) {
      return null;
    }

    const club = state.clubs.find((entry) => entry.id === team.clubId);
    return {
      ...team,
      club,
      players: state.players.filter((player) => player.teamId === team.id),
      matches: state.matches.filter((match) => match.teamId === team.id)
    };
  },

  listMatches() {
    return state.matches.map((match) => ({
      ...match,
      team: state.teams.find((team) => team.id === match.teamId)
    }));
  },

  createMatch(payload) {
    const match = {
      id: nextId("match"),
      createdAt: new Date().toISOString(),
      ...payload
    };
    state.matches.unshift(match);
    return match;
  },

  listChats(userId) {
    return state.chatThreads
      .filter((thread) => thread.contextType === "global" || thread.participantIds.includes(userId))
      .map((thread) => {
        const lastMessage = sortByCreatedAt(
          state.messages.filter((message) => message.threadId === thread.id)
        )[0] || null;
        return {
          ...thread,
          blocked: this.getChatBlock(thread.id),
          lastMessage
        };
      });
  },

  getChat(threadId) {
    return state.chatThreads.find((thread) => thread.id === threadId) || null;
  },

  canAccessChat(threadId, userId) {
    const thread = this.getChat(threadId);
    if (!thread) {
      return false;
    }

    return thread.contextType === "global" || thread.participantIds.includes(userId);
  },

  getChatBlock(threadId) {
    return state.chatBlocks.find((entry) => entry.threadId === threadId) || null;
  },

  isChatBlocked(threadId) {
    return Boolean(this.getChatBlock(threadId));
  },

  findOrCreateItemChat({ itemId, requesterId, requesterName }) {
    const item = this.getItem(itemId);
    if (!item) {
      return null;
    }

    const ownerId = item.ownerId;
    const participantIds = [ownerId, requesterId].sort();

    let thread = state.chatThreads.find((entry) => {
      if (entry.contextType !== "item" || entry.contextId !== itemId) {
        return false;
      }

      if (entry.participantIds.length !== participantIds.length) {
        return false;
      }

      const sortedParticipants = [...entry.participantIds].sort();
      return sortedParticipants.every((participantId, index) => participantId === participantIds[index]);
    });

    if (!thread) {
      thread = {
        id: nextId("chat"),
        title:
          requesterId === ownerId
            ? `${item.title} Owner Room`
            : `${item.title} Inquiry with ${item.owner?.name || "Owner"}`,
        participantIds,
        contextType: "item",
        contextId: itemId,
        itemTitle: item.title
      };
      state.chatThreads.unshift(thread);

      if (requesterId !== ownerId) {
        state.messages.push({
          id: nextId("message"),
          threadId: thread.id,
          senderId: requesterId,
          senderName: requesterName || "Student",
          text: `Hi, I am interested in "${item.title}". Is it still available?`,
          createdAt: new Date().toISOString()
        });
      }
    }

    const lastMessage = sortByCreatedAt(state.messages.filter((message) => message.threadId === thread.id))[0] || null;
    return { ...thread, lastMessage };
  },

  findOrCreateResourceShareChat({
    resourceId,
    resourceTitle,
    resourceUrl,
    senderId,
    senderName,
    recipientId,
    recipientName
  }) {
    const participantIds = [senderId, recipientId].sort();

    let thread = state.chatThreads.find((entry) => {
      if (entry.contextType !== "resource-share" || entry.contextId !== resourceId) {
        return false;
      }

      if (entry.participantIds.length !== participantIds.length) {
        return false;
      }

      const sortedParticipants = [...entry.participantIds].sort();
      return sortedParticipants.every((participantId, index) => participantId === participantIds[index]);
    });

    if (!thread) {
      thread = {
        id: nextId("chat"),
        title: `${resourceTitle} Shared With ${recipientName || "Friend"}`,
        participantIds,
        contextType: "resource-share",
        contextId: resourceId,
        resourceTitle
      };
      state.chatThreads.unshift(thread);
    }

    const shareText = `I shared the note "${resourceTitle}" with you. Download here: ${resourceUrl}`;
    const message = {
      id: nextId("message"),
      threadId: thread.id,
      createdAt: new Date().toISOString(),
      senderId,
      senderName,
      text: shareText
    };
    state.messages.push(message);

    return {
      ...thread,
      lastMessage: message
    };
  },

  listFriendRequests(userId) {
    const pending = state.friendRequests.filter((request) => request.status === "pending");
    return {
      incoming: sortByCreatedAt(pending.filter((request) => request.recipientId === userId)),
      outgoing: sortByCreatedAt(pending.filter((request) => request.senderId === userId))
    };
  },

  listFriendships(userId) {
    return sortByCreatedAt(
      state.friendships.filter((friendship) => friendship.userIds.includes(userId))
    );
  },

  areFriends(userId, otherUserId) {
    return state.friendships.some(
      (friendship) =>
        friendship.userIds.includes(userId) &&
        friendship.userIds.includes(otherUserId)
    );
  },

  getFriendshipStatus(currentUserId, otherUserId) {
    if (this.areFriends(currentUserId, otherUserId)) {
      return "friends";
    }

    const request = state.friendRequests.find(
      (entry) =>
        entry.status === "pending" &&
        ((entry.senderId === currentUserId && entry.recipientId === otherUserId) ||
          (entry.senderId === otherUserId && entry.recipientId === currentUserId))
    );

    if (!request) {
      return "none";
    }

    return request.senderId === currentUserId ? "outgoing" : "incoming";
  },

  sendFriendRequest(senderId, recipientId) {
    if (senderId === recipientId) {
      return { error: "You cannot send a friend request to yourself." };
    }

    if (this.areFriends(senderId, recipientId)) {
      return { error: "You are already friends with this student." };
    }

    const existing = state.friendRequests.find(
      (entry) =>
        entry.status === "pending" &&
        ((entry.senderId === senderId && entry.recipientId === recipientId) ||
          (entry.senderId === recipientId && entry.recipientId === senderId))
    );

    if (existing) {
      return { error: "A friend request is already pending." };
    }

    const request = {
      id: nextId("friend-request"),
      senderId,
      recipientId,
      status: "pending",
      createdAt: new Date().toISOString()
    };
    state.friendRequests.unshift(request);
    return { request };
  },

  acceptFriendRequest(requestId, recipientId) {
    const request = state.friendRequests.find((entry) => entry.id === requestId);
    if (!request || request.status !== "pending") {
      return { error: "Friend request not found." };
    }

    if (request.recipientId !== recipientId) {
      return { error: "Only the receiving student can accept this request." };
    }

    request.status = "accepted";
    const userIds = [request.senderId, request.recipientId].sort();
    const existingFriendship = state.friendships.find(
      (friendship) =>
        friendship.userIds.length === userIds.length &&
        friendship.userIds.every((userId, index) => userId === userIds[index])
    );

    if (!existingFriendship) {
      state.friendships.unshift({
        id: nextId("friendship"),
        userIds,
        createdAt: new Date().toISOString()
      });
    }

    return { request };
  },

  getFriendNetwork(userId) {
    const incoming = this.listFriendRequests(userId).incoming;
    const outgoing = this.listFriendRequests(userId).outgoing;
    const friendships = this.listFriendships(userId);
    const friendIds = friendships.map((friendship) =>
      friendship.userIds.find((entry) => entry !== userId)
    );

    return {
      incoming,
      outgoing,
      friendships,
      friendIds,
      followersCount: friendIds.length,
      followingCount: friendIds.length,
      friendsCount: friendIds.length
    };
  },

  findOrCreateFriendChat({ userId, userName, friendId, friendName }) {
    if (!this.areFriends(userId, friendId)) {
      return null;
    }

    const participantIds = [userId, friendId].sort();
    let thread = state.chatThreads.find((entry) => {
      if (entry.contextType !== "friend") {
        return false;
      }

      if (entry.participantIds.length !== participantIds.length) {
        return false;
      }

      const sortedParticipants = [...entry.participantIds].sort();
      return sortedParticipants.every((participantId, index) => participantId === participantIds[index]);
    });

    if (!thread) {
      thread = {
        id: nextId("chat"),
        title: `${friendName || "Student"} Direct Message`,
        participantIds,
        contextType: "friend",
        contextId: participantIds.join(":")
      };
      state.chatThreads.unshift(thread);

      state.messages.push({
        id: nextId("message"),
        threadId: thread.id,
        senderId: userId,
        senderName: userName,
        text: `Hi ${friendName || "there"}, we are connected now. Let's chat here.`,
        createdAt: new Date().toISOString()
      });
    }

    const lastMessage = sortByCreatedAt(state.messages.filter((message) => message.threadId === thread.id))[0] || null;
    return { ...thread, blocked: this.getChatBlock(thread.id), lastMessage };
  },

  findOrCreateAdminChat({ userId, userName, adminId, adminName }) {
    const participantIds = [userId, adminId].sort();
    let thread = state.chatThreads.find((entry) => {
      if (entry.contextType !== "admin") {
        return false;
      }

      if (entry.participantIds.length !== participantIds.length) {
        return false;
      }

      const sortedParticipants = [...entry.participantIds].sort();
      return sortedParticipants.every((participantId, index) => participantId === participantIds[index]);
    });

    if (!thread) {
      thread = {
        id: nextId("chat"),
        title: "DM with Admin",
        participantIds,
        contextType: "admin",
        contextId: participantIds.join(":")
      };
      state.chatThreads.unshift(thread);

      if (userId !== adminId) {
        state.messages.push({
          id: nextId("message"),
          threadId: thread.id,
          senderId: userId,
          senderName: userName,
          text: `Hi ${adminName || "Admin"}, I need help regarding Campus Connect.`,
          createdAt: new Date().toISOString()
        });
      }
    }

    const lastMessage = sortByCreatedAt(state.messages.filter((message) => message.threadId === thread.id))[0] || null;
    return { ...thread, lastMessage };
  },

  listAdminInbox() {
    return sortByCreatedAt(
      state.chatThreads
        .filter((thread) => thread.contextType === "admin")
        .map((thread) => {
          const lastMessage = sortByCreatedAt(state.messages.filter((message) => message.threadId === thread.id))[0] || null;
          return {
            ...thread,
            lastMessage
          };
        })
    );
  },

  blockChat(threadId, blockerId) {
    const thread = this.getChat(threadId);
    if (!thread || !thread.participantIds.includes(blockerId) || thread.contextType !== "friend") {
      return null;
    }

    const existing = this.getChatBlock(threadId);
    if (existing) {
      return existing;
    }

    const blockedUserId = thread.participantIds.find((entry) => entry !== blockerId);
    const block = {
      id: nextId("chat-block"),
      threadId,
      blockerId,
      blockedUserId,
      createdAt: new Date().toISOString()
    };
    state.chatBlocks.unshift(block);
    return block;
  },

  reportChat(threadId, reporterId, reason) {
    const thread = this.getChat(threadId);
    if (!thread || !thread.participantIds.includes(reporterId) || thread.contextType !== "friend") {
      return null;
    }

    const existing = state.chatReports.find(
      (entry) => entry.threadId === threadId && entry.reporterId === reporterId && entry.status === "pending"
    );
    if (existing) {
      return existing;
    }

    const report = {
      id: nextId("chat-report"),
      threadId,
      reporterId,
      reportedUserId: thread.participantIds.find((entry) => entry !== reporterId),
      reason: reason || "No reason provided",
      status: "pending",
      createdAt: new Date().toISOString()
    };
    state.chatReports.unshift(report);
    return report;
  },

  listPendingChatReports() {
    return sortByCreatedAt(state.chatReports.filter((entry) => entry.status === "pending")).map((report) => ({
      ...report,
      thread: this.getChat(report.threadId)
    }));
  },

  listMessages(threadId) {
    return sortByCreatedAt(state.messages.filter((message) => message.threadId === threadId)).map((message) => ({
      ...message,
      sender: publicUser(this.findUserById(message.senderId)) || (message.senderName ? { name: message.senderName } : null)
    }));
  },

  addMessage(threadId, payload) {
    const message = {
      id: nextId("message"),
      threadId,
      createdAt: new Date().toISOString(),
      ...payload
    };
    state.messages.push(message);
    return {
      ...message,
      sender: publicUser(this.findUserById(message.senderId)) || (message.senderName ? { name: message.senderName } : null)
    };
  },

  listBookmarks(userId) {
    return state.bookmarks
      .filter((bookmark) => bookmark.userId === userId)
      .map((bookmark) => {
        if (bookmark.resourceType === "resource") {
          return { type: "resource", item: this.getResource(bookmark.resourceId, userId) };
        }

        if (bookmark.resourceType === "opportunity") {
          return {
            type: "opportunity",
            item: this.listOpportunities().find((entry) => entry.id === bookmark.resourceId)
          };
        }

        return null;
      })
      .filter(Boolean);
  },

  getDashboardSummary(userId) {
    const user = publicUser(this.findUserById(userId || "user-1"));
    return {
      user,
      counts: {
        resources: state.resources.length,
        items: state.items.length,
        opportunities: state.opportunities.length,
        clubs: state.clubs.length
      },
      recentActivity: [
        ...this.listResources({ userId }).slice(0, 1).map((item) => ({
          title: `${item.title} uploaded`,
          description: item.description
        })),
        ...this.listItems().slice(0, 1).map((item) => ({
          title: `${item.title} listed`,
          description: item.description
        })),
        ...this.listAnnouncements().slice(0, 1).map((item) => ({
          title: item.title,
          description: item.description
        }))
      ]
    };
  },

  getAdminOverview() {
    const pendingReports = this.listPendingChatReports();
    const moderationQueue = [
      ...state.resources.filter((resource) => resource.status === "pending").map((entry) => ({
        id: entry.id,
        module: "resource",
        label: "Notes",
        title: entry.title,
        status: entry.status
      })),
      ...state.items.filter((item) => item.status !== "available").map((entry) => ({
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

    return {
      counts: {
        users: state.users.length,
        uploads: state.resources.length,
        listings: state.items.length + state.lostFound.length,
        reports: pendingReports.length
      },
      moderationQueue,
      pendingReports
    };
  },

  moderateEntity(moduleName, entityId, status) {
    const modules = {
      resource: state.resources,
      item: state.items,
      lostFound: state.lostFound,
      report: state.chatReports
    };
    const collection = modules[moduleName];

    if (!collection) {
      return null;
    }

    const entity = collection.find((entry) => entry.id === entityId);
    if (!entity) {
      return null;
    }

    entity.status = status;
    return entity;
  }
};

module.exports = { demoStore };
