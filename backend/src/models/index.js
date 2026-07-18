const { mongoose } = require("../config/db");

const userSchema = new mongoose.Schema(
  {
    name: String,
    collegeEmail: { type: String, unique: true },
    department: String,
    year: String,
    registerNumber: String,
    phone: String,
    memberTag: String,
    about: String,
    passwordHash: String
  },
  { timestamps: true }
);

const academicResourceSchema = new mongoose.Schema(
  {
    type: String,
    title: String,
    description: String,
    department: String,
    subject: String,
    category: String,
    difficulty: String,
    fileType: String,
    fileUrl: String,
    externalUrl: String,
    uploaderId: String,
    status: { type: String, default: "approved" }
  },
  { timestamps: true }
);

const doubtSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    department: String,
    subject: String,
    imageUrl: String,
    status: { type: String, default: "open" },
    authorId: String
  },
  { timestamps: true }
);

const answerSchema = new mongoose.Schema(
  {
    doubtId: String,
    content: String,
    authorId: String,
    upvotes: { type: Number, default: 0 },
    upvotedBy: [String]
  },
  { timestamps: true }
);

const bookmarkSchema = new mongoose.Schema(
  {
    userId: String,
    resourceType: String,
    resourceId: String
  },
  { timestamps: true }
);

const itemListingSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    department: String,
    itemType: String,
    priceType: String,
    priceValue: String,
    imageUrl: String,
    isEmergency: { type: Boolean, default: false },
    status: { type: String, default: "pending" },
    ownerId: String
  },
  { timestamps: true }
);

const lostFoundSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    postType: String,
    location: String,
    contact: String,
    ownerId: String,
    status: String
  },
  { timestamps: true }
);

const announcementSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    tag: String,
    dateLabel: String,
    authorId: String
  },
  { timestamps: true }
);

const opportunitySchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    type: String,
    company: String,
    contactInfo: String,
    authorId: String,
    applicants: [String]
  },
  { timestamps: true }
);

const projectIdeaSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    authorId: String
  },
  { timestamps: true }
);

const projectIdeaReplySchema = new mongoose.Schema(
  {
    projectIdeaId: String,
    content: String,
    authorId: String
  },
  { timestamps: true }
);

const clubSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    moduleType: { type: String, default: "sports" },
    recruiting: Boolean,
    coverColor: String,
    achievements: [String],
    logoUrl: String,
    ownerId: String,
    ownerName: String,
    ownerRegisterNumber: String,
    ownerDepartment: String,
    ownerCollegeEmail: String,
    createdFromRequestId: String
  },
  { timestamps: true }
);

const clubMembershipSchema = new mongoose.Schema(
  {
    clubId: String,
    userId: String,
    role: { type: String, default: "member" }
  },
  { timestamps: true }
);

const clubOpenCallSchema = new mongoose.Schema(
  {
    clubId: String,
    title: String,
    description: String,
    opensAt: Date,
    closesAt: Date,
    createdBy: String,
    status: { type: String, default: "scheduled" }
  },
  { timestamps: true }
);

const clubAnnouncementSchema = new mongoose.Schema(
  {
    clubId: String,
    authorId: String,
    authorName: String,
    title: String,
    description: String
  },
  { timestamps: true }
);

const teamSchema = new mongoose.Schema(
  {
    clubId: String,
    name: String,
    description: String,
    captain: String,
    recruiting: Boolean
  },
  { timestamps: true }
);

const playerSchema = new mongoose.Schema(
  {
    teamId: String,
    name: String,
    department: String,
    year: String,
    photoUrl: String,
    achievements: [String]
  },
  { timestamps: true }
);

const matchSchema = new mongoose.Schema(
  {
    teamId: String,
    opponent: String,
    result: String,
    fixtureDate: String,
    score: String,
    mvp: String
  },
  { timestamps: true }
);

const chatThreadSchema = new mongoose.Schema(
  {
    title: String,
    participantIds: [String],
    contextType: String,
    contextId: String,
    itemTitle: String,
    resourceTitle: String
  },
  { timestamps: true }
);

const messageSchema = new mongoose.Schema(
  {
    threadId: String,
    senderId: String,
    senderName: String,
    text: String
  },
  { timestamps: true }
);

const friendRequestSchema = new mongoose.Schema(
  {
    senderId: String,
    recipientId: String,
    status: { type: String, default: "pending" }
  },
  { timestamps: true }
);

const friendshipSchema = new mongoose.Schema(
  {
    userIds: [String]
  },
  { timestamps: true }
);

const chatBlockSchema = new mongoose.Schema(
  {
    threadId: String,
    blockerId: String,
    blockedUserId: String
  },
  { timestamps: true }
);

const chatReportSchema = new mongoose.Schema(
  {
    threadId: String,
    reporterId: String,
    reason: String,
    status: { type: String, default: "pending" }
  },
  { timestamps: true }
);

const clubRequestSchema = new mongoose.Schema(
  {
    requesterId: String,
    requestType: { type: String, default: "club" },
    clubName: String,
    clubHead: String,
    registerNumber: String,
    department: String,
    phone: String,
    collegeEmail: String,
    description: String,
    passportPhotoUrl: String,
    collegeIdCardUrl: String,
    clubLogoUrl: String,
    clubHeadProofUrl: String,
    sportHeadProofUrl: String,
    status: { type: String, default: "pending" },
    createdClubId: String
  },
  { timestamps: true }
);

const quickSportFormationSchema = new mongoose.Schema(
  {
    sportName: String,
    description: String,
    playAt: Date,
    location: String,
    playersNeeded: Number,
    authorId: String,
    authorName: String,
    authorRegisterNumber: String,
    authorDepartment: String
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
const AcademicResource =
  mongoose.models.AcademicResource || mongoose.model("AcademicResource", academicResourceSchema);
const Doubt = mongoose.models.Doubt || mongoose.model("Doubt", doubtSchema);
const Answer = mongoose.models.Answer || mongoose.model("Answer", answerSchema);
const Bookmark = mongoose.models.Bookmark || mongoose.model("Bookmark", bookmarkSchema);
const ItemListing = mongoose.models.ItemListing || mongoose.model("ItemListing", itemListingSchema);
const LostFoundPost = mongoose.models.LostFoundPost || mongoose.model("LostFoundPost", lostFoundSchema);
const Announcement = mongoose.models.Announcement || mongoose.model("Announcement", announcementSchema);
const Opportunity = mongoose.models.Opportunity || mongoose.model("Opportunity", opportunitySchema);
const ProjectIdea = mongoose.models.ProjectIdea || mongoose.model("ProjectIdea", projectIdeaSchema);
const ProjectIdeaReply = mongoose.models.ProjectIdeaReply || mongoose.model("ProjectIdeaReply", projectIdeaReplySchema);
const Club = mongoose.models.Club || mongoose.model("Club", clubSchema);
const ClubMembership = mongoose.models.ClubMembership || mongoose.model("ClubMembership", clubMembershipSchema);
const ClubOpenCall = mongoose.models.ClubOpenCall || mongoose.model("ClubOpenCall", clubOpenCallSchema);
const ClubAnnouncement = mongoose.models.ClubAnnouncement || mongoose.model("ClubAnnouncement", clubAnnouncementSchema);
const Team = mongoose.models.Team || mongoose.model("Team", teamSchema);
const Player = mongoose.models.Player || mongoose.model("Player", playerSchema);
const Match = mongoose.models.Match || mongoose.model("Match", matchSchema);
const ChatThread = mongoose.models.ChatThread || mongoose.model("ChatThread", chatThreadSchema);
const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);
const FriendRequest = mongoose.models.FriendRequest || mongoose.model("FriendRequest", friendRequestSchema);
const Friendship = mongoose.models.Friendship || mongoose.model("Friendship", friendshipSchema);
const ChatBlock = mongoose.models.ChatBlock || mongoose.model("ChatBlock", chatBlockSchema);
const ChatReport = mongoose.models.ChatReport || mongoose.model("ChatReport", chatReportSchema);
const ClubRequest = mongoose.models.ClubRequest || mongoose.model("ClubRequest", clubRequestSchema);
const QuickSportFormation =
  mongoose.models.QuickSportFormation || mongoose.model("QuickSportFormation", quickSportFormationSchema);

module.exports = {
  AcademicResource,
  Announcement,
  Answer,
  Bookmark,
  ChatBlock,
  ChatReport,
  ChatThread,
  Club,
  ClubAnnouncement,
  ClubMembership,
  ClubOpenCall,
  ClubRequest,
  Doubt,
  FriendRequest,
  Friendship,
  ItemListing,
  LostFoundPost,
  Match,
  Message,
  Opportunity,
  ProjectIdea,
  ProjectIdeaReply,
  QuickSportFormation,
  Player,
  Team,
  User
};
