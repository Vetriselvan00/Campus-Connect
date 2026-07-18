const seedData = {
  users: [
    {
      id: "user-1",
      name: "Aparna S",
      collegeEmail: "2023123456@student.annauniv.edu",
      department: "CSE",
      year: "3",
      registerNumber: "2023123456",
      phone: "9876543210",
      memberTag: "Notes Buddy",
      about: "Student organizer and notes curator.",
      passwordHash: "$plain$Campus@123",
      role: "student"
    },
    {
      id: "user-2",
      name: "Rahul K",
      collegeEmail: "2023987654@student.annauniv.edu",
      department: "ECE",
      year: "4",
      registerNumber: "2023987654",
      phone: "9123456780",
      memberTag: "Sports Captain",
      about: "Club leader for the football community.",
      passwordHash: "$plain$Campus@123",
      role: "club_leader"
    },
    {
      id: "user-3",
      name: "Admin User",
      collegeEmail: "2023000001@student.annauniv.edu",
      department: "IT",
      year: "4",
      registerNumber: "2023000001",
      phone: "9000000001",
      memberTag: "Admin Desk",
      about: "Campus Connect administrator.",
      passwordHash: "$plain$Admin@123",
      role: "admin"
    },
    {
      id: "user-4",
      name: "Priya Alumni",
      collegeEmail: "2022000002@student.annauniv.edu",
      department: "CSE",
      year: "Alumni",
      registerNumber: "2022000002",
      phone: "9000000002",
      memberTag: "Career Mentor",
      about: "Alumni mentor sharing internships.",
      passwordHash: "$plain$Campus@123",
      role: "alumni"
    }
  ],
  resources: [
    {
      id: "resource-1",
      type: "notes",
      title: "Data Structures Unit 3 Notes",
      description: "Clean handwritten notes covering trees, graphs, and complexity shortcuts.",
      department: "CSE",
      subject: "Data Structures",
      category: "Notes",
      difficulty: "medium",
      fileType: "PDF",
      fileUrl: "/uploads/sample-ds-notes.pdf",
      uploaderId: "user-1",
      status: "approved",
      createdAt: "2026-04-10T08:30:00.000Z"
    },
    {
      id: "resource-2",
      type: "question-bank",
      title: "Operating Systems Previous Year Questions",
      description: "Compiled question bank for semester exam preparation.",
      department: "CSE",
      subject: "Operating Systems",
      category: "Question Bank",
      difficulty: "easy",
      fileType: "DOC",
      fileUrl: "/uploads/os-question-bank.docx",
      uploaderId: "user-1",
      status: "approved",
      createdAt: "2026-04-11T09:45:00.000Z"
    },
    {
      id: "resource-3",
      type: "important-questions",
      title: "Digital Communication Important Questions",
      description: "Most repeated viva and theory questions with answers.",
      department: "ECE",
      subject: "Digital Communication",
      category: "Important Questions",
      difficulty: "hard",
      fileType: "TXT",
      fileUrl: "/uploads/digital-communication.txt",
      uploaderId: "user-2",
      status: "pending",
      createdAt: "2026-04-11T11:00:00.000Z"
    }
  ],
  doubts: [
    {
      id: "doubt-1",
      title: "How does Dijkstra differ from Bellman-Ford?",
      description: "I need a simple explanation with when to use each in exams.",
      department: "CSE",
      subject: "Design and Analysis of Algorithms",
      status: "open",
      authorId: "user-1",
      createdAt: "2026-04-12T06:00:00.000Z"
    },
    {
      id: "doubt-2",
      title: "Difference between ASK and FSK",
      description: "Can someone explain this with one easy example?",
      department: "ECE",
      subject: "Digital Communication",
      status: "resolved",
      authorId: "user-2",
      createdAt: "2026-04-11T06:00:00.000Z"
    }
  ],
  answers: [
    {
      id: "answer-1",
      doubtId: "doubt-1",
      content: "Dijkstra works with non-negative edges while Bellman-Ford also handles negative edges.",
      authorId: "user-2",
      upvotes: 4,
      upvotedBy: ["user-1"],
      createdAt: "2026-04-12T07:30:00.000Z"
    },
    {
      id: "answer-2",
      doubtId: "doubt-2",
      content: "ASK changes amplitude, FSK changes frequency. Think volume versus tone.",
      authorId: "user-1",
      upvotes: 6,
      upvotedBy: ["user-2"],
      createdAt: "2026-04-11T08:00:00.000Z"
    }
  ],
  bookmarks: [
    { id: "bookmark-1", userId: "user-1", resourceType: "resource", resourceId: "resource-1" },
    { id: "bookmark-2", userId: "user-1", resourceType: "opportunity", resourceId: "opportunity-1" }
  ],
  items: [
    {
      id: "item-1",
      title: "Scientific Calculator",
      description: "Well-maintained calculator available for semester rental.",
      department: "CSE",
      itemType: "Calculator",
      priceType: "rental",
      priceValue: "150 / week",
      imageUrl: "",
      status: "available",
      ownerId: "user-1",
      createdAt: "2026-04-12T10:30:00.000Z"
    },
    {
      id: "item-2",
      title: "Embedded Systems Textbook",
      description: "Reference book for juniors, free pickup in hostel block B.",
      department: "ECE",
      itemType: "Book",
      priceType: "free",
      priceValue: "Free",
      imageUrl: "",
      status: "available",
      ownerId: "user-2",
      createdAt: "2026-04-12T11:15:00.000Z"
    }
  ],
  lostFound: [
    {
      id: "lostfound-1",
      title: "Lost ID Card",
      description: "Blue lanyard with student ID lost near library block.",
      postType: "lost",
      location: "Main Library",
      contact: "2023123456@student.annauniv.edu",
      ownerId: "user-1",
      status: "open",
      createdAt: "2026-04-12T12:00:00.000Z"
    },
    {
      id: "lostfound-2",
      title: "Found Water Bottle",
      description: "Black steel bottle found near football ground.",
      postType: "found",
      location: "Football Ground",
      contact: "2023987654@student.annauniv.edu",
      ownerId: "user-2",
      status: "open",
      createdAt: "2026-04-12T13:00:00.000Z"
    }
  ],
  announcements: [
    {
      id: "announcement-1",
      title: "CSE Symposium Registrations Open",
      description: "Paper presentation and hackathon registrations are now live for all departments.",
      tag: "Symposium",
      dateLabel: "13 Apr 2026",
      authorId: "user-3",
      createdAt: "2026-04-12T09:00:00.000Z"
    },
    {
      id: "announcement-2",
      title: "Workshop on Resume Building",
      description: "Training and placement cell is conducting a workshop this Friday.",
      tag: "Workshop",
      dateLabel: "15 Apr 2026",
      authorId: "user-3",
      createdAt: "2026-04-11T14:00:00.000Z"
    }
  ],
  opportunities: [
    {
      id: "opportunity-1",
      title: "Frontend Intern - Alumni Startup",
      description: "Remote summer internship for students with HTML, CSS, and JavaScript basics.",
      type: "internship",
      company: "NextOrbit Labs",
      contactInfo: "careers@nextorbit.example",
      authorId: "user-4",
      applicants: ["user-1"],
      createdAt: "2026-04-12T05:30:00.000Z"
    },
    {
      id: "opportunity-2",
      title: "Mini Project Team Recruitment",
      description: "Looking for 2 members for a smart campus IoT project.",
      type: "project",
      company: "Campus Community",
      contactInfo: "2023987654@student.annauniv.edu",
      authorId: "user-2",
      applicants: [],
      createdAt: "2026-04-11T17:30:00.000Z"
    }
  ],
  clubs: [
    {
      id: "club-1",
      name: "Falcons Football Club",
      description: "Active football club focused on inter-college tournaments and weekly practice.",
      recruiting: true,
      coverColor: "from-emerald-400 to-teal-500",
      achievements: ["Zone-level runners up", "Best defensive unit 2025"]
    },
    {
      id: "club-2",
      name: "Smash Badminton Club",
      description: "Competitive badminton club for singles and doubles events.",
      recruiting: false,
      coverColor: "from-orange-400 to-rose-500",
      achievements: ["Two district medals", "Consistent top-4 finishes"]
    }
  ],
  teams: [
    {
      id: "team-1",
      clubId: "club-1",
      name: "Falcons A Team",
      description: "Primary football squad representing the college in external fixtures.",
      captain: "Rahul K",
      recruiting: true
    },
    {
      id: "team-2",
      clubId: "club-2",
      name: "Smash Doubles Squad",
      description: "Lead doubles pairing with a strong campus record.",
      captain: "Nisha R",
      recruiting: false
    }
  ],
  players: [
    {
      id: "player-1",
      teamId: "team-1",
      name: "Rahul K",
      department: "ECE",
      year: "4",
      photoUrl: "",
      achievements: ["MVP - Inter College Cup"]
    },
    {
      id: "player-2",
      teamId: "team-1",
      name: "Varun P",
      department: "MECH",
      year: "3",
      photoUrl: "",
      achievements: ["Top scorer - Campus League"]
    },
    {
      id: "player-3",
      teamId: "team-2",
      name: "Nisha R",
      department: "IT",
      year: "2",
      photoUrl: "",
      achievements: ["District semifinalist"]
    }
  ],
  matches: [
    {
      id: "match-1",
      teamId: "team-1",
      opponent: "Tech Titans",
      result: "Won",
      fixtureDate: "18 Apr 2026",
      score: "2 - 1",
      mvp: "Rahul K"
    },
    {
      id: "match-2",
      teamId: "team-2",
      opponent: "Net Ninjas",
      result: "Upcoming",
      fixtureDate: "20 Apr 2026",
      score: "TBD",
      mvp: "-"
    }
  ],
  chatThreads: [
    {
      id: "chat-global",
      title: "Campus Connect Global Chat",
      participantIds: [],
      contextType: "global",
      contextId: "global-room"
    },
    {
      id: "chat-1",
      title: "Calculator Discussion",
      participantIds: ["user-1", "user-2"],
      contextType: "item",
      contextId: "item-1"
    },
    {
      id: "chat-2",
      title: "Football Club Updates",
      participantIds: ["user-1", "user-2", "user-3"],
      contextType: "club",
      contextId: "club-1"
    }
  ],
  messages: [
    {
      id: "message-0",
      threadId: "chat-global",
      senderId: "user-3",
      senderName: "Admin User",
      text: "Welcome to the campus-wide chat room. Keep discussions respectful and useful.",
      createdAt: "2026-04-12T08:45:00.000Z"
    },
    {
      id: "message-1",
      threadId: "chat-1",
      senderId: "user-2",
      text: "The calculator is still available if you need it for next week.",
      createdAt: "2026-04-12T09:00:00.000Z"
    },
    {
      id: "message-2",
      threadId: "chat-1",
      senderId: "user-1",
      text: "Perfect, I can collect it after class tomorrow.",
      createdAt: "2026-04-12T09:10:00.000Z"
    },
    {
      id: "message-3",
      threadId: "chat-2",
      senderId: "user-3",
      text: "Practice is shifted to 5 PM because of the auditorium event.",
      createdAt: "2026-04-12T16:00:00.000Z"
    }
  ]
};

module.exports = { seedData };
