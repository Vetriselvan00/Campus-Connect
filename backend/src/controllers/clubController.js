const { env } = require("../config/env");
const {
  createClub: createMongoClub,
  createClubAnnouncement: createMongoClubAnnouncement,
  createClubFromRequest: createClubFromRequestRecord,
  createClubOpenCall: createMongoClubOpenCall,
  createClubRequest: createClubRequestRecord,
  createQuickSportFormation: createMongoQuickSportFormation,
  deleteClub: deleteMongoClub,
  deleteQuickSportFormation: deleteMongoQuickSportFormation,
  getClubRequestById: getClubRequestRecord,
  getClub: getMongoClub,
  getClubRoom: getMongoClubRoom,
  getTeam: getMongoTeam,
  joinClubViaOpenCall: joinMongoClubViaOpenCall,
  listClubRequests: listClubRequestRecords,
  listClubs: listMongoClubs,
  listQuickSportFormations: listMongoQuickSportFormations,
  listMatches: listMongoMatches
} = require("../services/campusMongoService");
const { demoStore } = require("../services/demoStore");

async function listClubs(req, res) {
  const viewerId = req.user?.id || req.user?._id?.toString() || "";
  const clubs = env.useDemoData ? demoStore.listClubs() : await listMongoClubs(req.query.moduleType || "sports", viewerId);
  res.json({ clubs });
}

async function getClub(req, res) {
  const club = env.useDemoData ? demoStore.getClub(req.params.id) : await getMongoClub(req.params.id);
  if (!club) {
    res.status(404).json({ message: "Club not found." });
    return;
  }

  res.json({ club });
}

async function getClubRoom(req, res) {
  if (env.useDemoData) {
    res.status(501).json({ message: "Club room is unavailable in demo mode." });
    return;
  }

  const userId = req.user.id || req.user._id?.toString();
  const room = await getMongoClubRoom(req.params.id, userId);
  if (!room) {
    res.status(404).json({ message: "Club not found." });
    return;
  }

  if (room.accessDenied) {
    res.status(403).json({ message: "Only the club head or joined members can access this club room.", club: room.club });
    return;
  }

  res.json(room);
}

async function getTeam(req, res) {
  const team = env.useDemoData ? demoStore.getTeam(req.params.id) : await getMongoTeam(req.params.id);
  if (!team) {
    res.status(404).json({ message: "Team not found." });
    return;
  }

  res.json({ team });
}

async function listMatches(_req, res) {
  const matches = env.useDemoData ? demoStore.listMatches() : await listMongoMatches();
  res.json({ matches });
}

async function listQuickSports(req, res) {
  if (env.useDemoData) {
    res.json({ quickTeams: [] });
    return;
  }

  const viewerId = req.user?.id || req.user?._id?.toString() || "";
  const quickTeams = await listMongoQuickSportFormations(viewerId);
  res.json({ quickTeams });
}

function createMatch(req, res) {
  const match = demoStore.createMatch({
    teamId: req.body.teamId,
    opponent: req.body.opponent,
    result: req.body.result,
    fixtureDate: req.body.fixtureDate,
    score: req.body.score,
    mvp: req.body.mvp
  });
  res.status(201).json({ message: "Match added successfully.", match });
}

async function createClub(req, res) {
  if (env.useDemoData) {
    res.status(501).json({ message: "Club creation is unavailable in demo mode." });
    return;
  }

  const achievements = Array.isArray(req.body.achievements)
    ? req.body.achievements
    : String(req.body.achievements || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  const club = await createMongoClub({
    name: String(req.body.name || "").trim(),
    description: String(req.body.description || "").trim(),
    moduleType: "sports",
    recruiting: String(req.body.recruiting).toLowerCase() !== "false",
    coverColor: String(req.body.coverColor || "from-sky-500 via-brand-500 to-violet-500").trim(),
    achievements
  });

  res.status(201).json({ message: "Club created successfully.", club });
}

async function submitClubRequest(req, res) {
  const userId = req.user.id || req.user._id?.toString();
  const passportPhotoUrl = req.files?.passportPhoto?.[0] ? `/uploads/${req.files.passportPhoto[0].filename}` : "";
  const collegeIdCardUrl = req.files?.collegeIdCard?.[0] ? `/uploads/${req.files.collegeIdCard[0].filename}` : "";
  const clubLogoUrl = req.files?.clubLogo?.[0] ? `/uploads/${req.files.clubLogo[0].filename}` : "";
  const clubHeadProofUrl = req.files?.clubHeadProof?.[0] ? `/uploads/${req.files.clubHeadProof[0].filename}` : "";
  const clubRequest = await createClubRequestRecord({
    requesterId: userId,
    requestType: "club",
    clubName: String(req.body.clubName || "").trim(),
    clubHead: String(req.body.clubHead || "").trim(),
    registerNumber: String(req.body.registerNumber || "").trim(),
    department: String(req.body.department || "").trim(),
    phone: String(req.body.phone || "").trim(),
    collegeEmail: String(req.body.collegeEmail || "").trim(),
    description: String(req.body.description || "").trim(),
    passportPhotoUrl,
    collegeIdCardUrl,
    clubLogoUrl,
    clubHeadProofUrl
  });

  res.status(201).json({
    message: "Club request sent successfully. Admin can now review it in Club Requests.",
    request: clubRequest
  });
}

async function submitSportRequest(req, res) {
  const userId = req.user.id || req.user._id?.toString();
  const passportPhotoUrl = req.files?.passportPhoto?.[0] ? `/uploads/${req.files.passportPhoto[0].filename}` : "";
  const collegeIdCardUrl = req.files?.collegeIdCard?.[0] ? `/uploads/${req.files.collegeIdCard[0].filename}` : "";
  const sportHeadProofUrl = req.files?.sportHeadProof?.[0] ? `/uploads/${req.files.sportHeadProof[0].filename}` : "";
  const sportImageUrl = req.files?.sportImage?.[0] ? `/uploads/${req.files.sportImage[0].filename}` : "";
  const sportRequest = await createClubRequestRecord({
    requesterId: userId,
    requestType: "sport",
    clubName: String(req.body.sportName || "").trim(),
    clubHead: String(req.body.sportHead || "").trim(),
    registerNumber: String(req.body.registerNumber || "").trim(),
    department: String(req.body.department || "").trim(),
    phone: String(req.body.phone || "").trim(),
    collegeEmail: String(req.body.collegeEmail || "").trim(),
    description: String(req.body.description || "").trim(),
    passportPhotoUrl,
    collegeIdCardUrl,
    clubLogoUrl: sportImageUrl,
    sportHeadProofUrl
  });

  res.status(201).json({
    message: "Sports request sent successfully. Admin can now review it in Sports Requests.",
    request: sportRequest
  });
}

async function listClubRequests(_req, res) {
  if (env.useDemoData) {
    res.json({ requests: [] });
    return;
  }

  const requests = await listClubRequestRecords();
  res.json({ requests });
}

async function getClubRequest(req, res) {
  if (env.useDemoData) {
    res.status(404).json({ message: "Club request not found." });
    return;
  }

  const request = await getClubRequestRecord(req.params.id);
  if (!request) {
    res.status(404).json({ message: "Club request not found." });
    return;
  }

  res.json({ request });
}

async function createClubFromRequest(req, res) {
  if (env.useDemoData) {
    res.status(501).json({ message: "Club creation is unavailable in demo mode." });
    return;
  }

  const achievements = Array.isArray(req.body.achievements)
    ? req.body.achievements
    : String(req.body.achievements || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  const result = await createClubFromRequestRecord(req.params.id, {
    name: String(req.body.name || "").trim(),
    description: String(req.body.description || "").trim(),
    moduleType: String(req.body.moduleType || "").trim() || undefined,
    recruiting: String(req.body.recruiting).toLowerCase() !== "false",
    coverColor: String(req.body.coverColor || "from-sky-500 via-brand-500 to-violet-500").trim(),
    achievements,
    logoUrl: String(req.body.logoUrl || "").trim()
  });

  if (!result) {
    res.status(404).json({ message: "Club request not found." });
    return;
  }

  res.status(201).json({ message: "Club created from request successfully.", ...result });
}

async function createClubOpenCall(req, res) {
  if (env.useDemoData) {
    res.status(501).json({ message: "Club open calls are unavailable in demo mode." });
    return;
  }

  const userId = req.user.id || req.user._id?.toString();
  const openCall = await createMongoClubOpenCall(req.params.id, userId, {
    title: String(req.body.title || "").trim(),
    description: String(req.body.description || "").trim(),
    opensAt: req.body.opensAt,
    closesAt: req.body.closesAt
  });

  if (!openCall) {
    res.status(403).json({ message: "Only the club head can schedule an open call." });
    return;
  }

  if (openCall.error) {
    res.status(400).json({ message: openCall.error });
    return;
  }

  res.status(201).json({ message: "Open call scheduled successfully.", openCall });
}

async function joinClub(req, res) {
  if (env.useDemoData) {
    res.status(501).json({ message: "Club joining is unavailable in demo mode." });
    return;
  }

  const userId = req.user.id || req.user._id?.toString();
  const result = await joinMongoClubViaOpenCall(req.params.id, userId);
  if (result?.error) {
    res.status(400).json({ message: result.error });
    return;
  }

  res.status(201).json({ message: "You joined the club successfully.", ...result });
}

async function createClubAnnouncement(req, res) {
  if (env.useDemoData) {
    res.status(501).json({ message: "Club announcements are unavailable in demo mode." });
    return;
  }

  const userId = req.user.id || req.user._id?.toString();
  const announcement = await createMongoClubAnnouncement(
    req.params.id,
    userId,
    {
      title: String(req.body.title || "").trim(),
      description: String(req.body.description || "").trim()
    },
    req.user.name
  );

  if (!announcement) {
    res.status(403).json({ message: "Only the club head can post club announcements." });
    return;
  }

  res.status(201).json({ message: "Club announcement posted successfully.", announcement });
}

async function createQuickSport(req, res) {
  if (env.useDemoData) {
    res.status(501).json({ message: "Quick sport formation is unavailable in demo mode." });
    return;
  }

  const sportName = String(req.body.sportName || "").trim();
  const description = String(req.body.description || "").trim();
  const location = String(req.body.location || "").trim();
  const playAt = req.body.playAt;
  const playersNeeded = Number(req.body.playersNeeded || 0);
  if (!sportName || !playAt || !location || !playersNeeded) {
    res.status(400).json({ message: "Sport name, play time, location, and players needed are required." });
    return;
  }

  const userId = req.user.id || req.user._id?.toString();
  const quickTeam = await createMongoQuickSportFormation({
    sportName,
    description,
    playAt,
    location,
    playersNeeded,
    authorId: userId,
    authorName: req.user.name || "",
    authorRegisterNumber: String(req.user.registerNumber || "").trim(),
    authorDepartment: String(req.user.department || "").trim()
  });

  res.status(201).json({ message: "Quick team formation posted for students.", quickTeam });
}

async function deleteClubEntity(req, res) {
  if (env.useDemoData) {
    res.status(501).json({ message: "Club deletion is unavailable in demo mode." });
    return;
  }

  const club = await deleteMongoClub(req.params.id);
  if (!club) {
    res.status(404).json({ message: "Club not found." });
    return;
  }

  res.json({
    message: club.moduleType === "sports" ? "Sport team deleted successfully." : "Club deleted successfully.",
    club
  });
}

async function deleteQuickSport(req, res) {
  if (env.useDemoData) {
    res.status(501).json({ message: "Quick sport deletion is unavailable in demo mode." });
    return;
  }

  const requesterId = req.user.id || req.user._id?.toString();
  const deleted = await deleteMongoQuickSportFormation(req.params.id, requesterId, Boolean(req.user.isAdmin));
  if (deleted === false) {
    res.status(403).json({ message: "Only the student who posted this quick team can delete it." });
    return;
  }
  if (!deleted) {
    res.status(404).json({ message: "Quick team formation not found." });
    return;
  }

  res.json({ message: "Quick team formation deleted.", quickTeam: deleted });
}

module.exports = {
  createClub,
  createClubAnnouncement,
  createClubFromRequest,
  createClubOpenCall,
  createQuickSport,
  createMatch,
  getClub,
  getClubRoom,
  getClubRequest,
  getTeam,
  joinClub,
  listClubRequests,
  listClubs,
  listQuickSports,
  listMatches,
  deleteClubEntity,
  deleteQuickSport,
  submitClubRequest
  ,
  submitSportRequest
};
