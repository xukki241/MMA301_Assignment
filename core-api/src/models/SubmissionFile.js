const mongoose = require('mongoose');
const { Schema } = mongoose;

const SubmissionFileSchema = new Schema({
  submissionId: { type: Schema.Types.ObjectId, ref: 'Submission', required: true },
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number },
  uploadedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('SubmissionFile', SubmissionFileSchema);
