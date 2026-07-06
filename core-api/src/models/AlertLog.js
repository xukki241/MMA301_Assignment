const mongoose = require('mongoose');
const { Schema } = mongoose;

const AlertLogSchema = new Schema({
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  studentId: { type: String, required: true }, // Auth service userId
  alertType: { type: String, required: true },
  message: { type: String, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['unread', 'read', 'resolved'], default: 'unread' },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('AlertLog', AlertLogSchema);
