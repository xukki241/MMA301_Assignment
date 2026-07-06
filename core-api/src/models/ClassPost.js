const mongoose = require('mongoose');
const { Schema } = mongoose;

const ClassPostSchema = new Schema({
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  authorId: { type: String, required: true }, // Auth service userId
  content: { type: String, required: true },
  attachmentUrls: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('ClassPost', ClassPostSchema);
