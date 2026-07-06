const mongoose = require('mongoose');
const { Schema } = mongoose;

const AlertThresholdSchema = new Schema({
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  metricType: { type: String, enum: ['attendance', 'grades', 'submissions'], required: true },
  thresholdValue: { type: Number, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('AlertThreshold', AlertThresholdSchema);
