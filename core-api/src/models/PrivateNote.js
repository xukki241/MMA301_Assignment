const mongoose = require('mongoose');
const { Schema } = mongoose;

const PrivateNoteSchema = new Schema({
  submissionId: { type: Schema.Types.ObjectId, ref: 'Submission', required: true },
  senderId: { type: String, required: true }, // Auth service userId
  receiverId: { type: String, required: true }, // Auth service userId
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('PrivateNote', PrivateNoteSchema);
