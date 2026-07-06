const mongoose = require('mongoose');
const { Schema } = mongoose;

const GradeSchema = new Schema({
  submissionId: { type: Schema.Types.ObjectId, ref: 'Submission', required: true },
  gradedBy: { type: String, required: true }, // Auth service userId
  points: { type: Number, required: true },
  feedback: { type: String },
  gradedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('Grade', GradeSchema);
