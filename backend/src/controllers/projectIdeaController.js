const {
  addProjectIdeaReply,
  createProjectIdea: createProjectIdeaRecord,
  getProjectIdeaById,
  listProjectIdeas: listProjectIdeaRecords
} = require("../services/campusMongoService");

async function listProjectIdeas(req, res) {
  const ideas = await listProjectIdeaRecords({
    search: req.query.search
  });
  res.json({ ideas });
}

async function getProjectIdea(req, res) {
  const idea = await getProjectIdeaById(req.params.id);
  if (!idea) {
    res.status(404).json({ message: "Project idea not found." });
    return;
  }

  res.json({ idea });
}

async function createProjectIdea(req, res) {
  const idea = await createProjectIdeaRecord({
    title: req.body.title,
    description: req.body.description,
    authorId: req.user.id || req.user._id?.toString()
  });
  res.status(201).json({ message: "Project idea posted successfully.", idea });
}

async function addIdeaReply(req, res) {
  const reply = await addProjectIdeaReply(req.params.id, {
    content: req.body.content,
    authorId: req.user.id || req.user._id?.toString()
  });
  if (!reply) {
    res.status(404).json({ message: "Project idea not found." });
    return;
  }

  res.status(201).json({ message: "Idea added successfully.", reply });
}

module.exports = {
  addIdeaReply,
  createProjectIdea,
  getProjectIdea,
  listProjectIdeas
};
