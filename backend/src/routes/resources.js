const express = require('express');
const router = express.Router();
const Resource = require('../models/Resource');

// Get all resources
router.get('/', async (req, res) => {
  try {
    const resources = await Resource.find();
    res.json(resources);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a new resource
router.post('/', async (req, res) => {
  const resource = new Resource({
    name: req.body.name,
    type: req.body.type,
    region: req.body.region,
    cost: req.body.cost
  });

  try {
    const newResource = await resource.save();
    res.status(201).json(newResource);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
