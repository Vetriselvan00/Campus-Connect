const { demoStore } = require("../services/demoStore");

function listOpportunities(_req, res) {
  res.json({ opportunities: demoStore.listOpportunities() });
}

function createOpportunity(req, res) {
  const opportunity = demoStore.createOpportunity({
    title: req.body.title,
    description: req.body.description,
    type: req.body.type,
    company: req.body.company,
    contactInfo: req.body.contactInfo,
    authorId: req.user.id
  });
  res.status(201).json({ message: "Opportunity posted successfully.", opportunity });
}

function applyToOpportunity(req, res) {
  const opportunity = demoStore.applyToOpportunity(req.params.id, req.user.id);
  if (!opportunity) {
    res.status(404).json({ message: "Opportunity not found." });
    return;
  }

  res.json({ message: "Application submitted.", opportunity });
}

module.exports = { applyToOpportunity, createOpportunity, listOpportunities };
