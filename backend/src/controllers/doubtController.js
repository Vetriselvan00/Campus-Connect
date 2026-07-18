const {
  addDoubtAnswer,
  createDoubt: createDoubtRecord,
  getDoubtById,
  listDoubts: listDoubtRecords,
  upvoteDoubtAnswer
} = require("../services/campusMongoService");

async function listDoubts(req, res) {
  const doubts = await listDoubtRecords({
    department: req.query.department,
    subject: req.query.subject,
    search: req.query.search
  });
  res.json({ doubts });
}

async function getDoubt(req, res) {
  const doubt = await getDoubtById(req.params.id);
  if (!doubt) {
    res.status(404).json({ message: "Doubt not found." });
    return;
  }

  res.json({ doubt });
}

async function createDoubt(req, res) {
  const doubt = await createDoubtRecord({
    title: req.body.title,
    description: req.body.description,
    department: req.body.department,
    subject: req.body.subject,
    imageUrl: req.file ? `/uploads/${req.file.filename}` : "",
    authorId: req.user.id || req.user._id?.toString()
  });
  res.status(201).json({ message: "Doubt posted successfully.", doubt });
}

async function addAnswer(req, res) {
  const answer = await addDoubtAnswer(req.params.id, {
    content: req.body.content,
    authorId: req.user.id || req.user._id?.toString()
  });
  if (!answer) {
    res.status(404).json({ message: "Doubt not found." });
    return;
  }

  res.status(201).json({ message: "Answer added successfully.", answer });
}

async function upvoteAnswer(req, res) {
  const answer = await upvoteDoubtAnswer(req.params.id, req.user.id || req.user._id?.toString());
  if (!answer) {
    res.status(404).json({ message: "Answer not found." });
    return;
  }

  res.json({ message: "Answer upvoted.", answer });
}

module.exports = { addAnswer, createDoubt, getDoubt, listDoubts, upvoteAnswer };
