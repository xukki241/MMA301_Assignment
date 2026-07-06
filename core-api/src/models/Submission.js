const mongoose = require('mongoose');
const { Schema } = mongoose;

const SubmissionSchema = new Schema({
  exerciseId: { type: Schema.Types.ObjectId, ref: 'Exercise', required: true },
  studentId: { type: String, required: true }, // Auth service userId
  submittedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['submitted', 'graded', 'late'], default: 'submitted' },
  points: { type: Number },
  feedback: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('Submission', SubmissionSchema);
