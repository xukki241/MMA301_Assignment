const mongoose = require('mongoose');
const { Schema } = mongoose;

const ClassSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  classCode: { type: String, required: true, unique: true },
  teacherId: { type: String, required: true }, // Auth service userId
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('Class', ClassSchema);
