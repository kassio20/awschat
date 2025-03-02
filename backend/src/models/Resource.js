const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  region: { type: String, required: true },
  cost: { type: Number, default: 0 },
  status: { type: String, default: 'running' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Resource', resourceSchema);
