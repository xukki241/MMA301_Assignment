const mongoose = require('mongoose');
const { Schema } = mongoose;

const MaterialSchema = new Schema({
  topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
  title: { type: String, required: true },
  description: { type: String },
  fileUrl: { type: String, required: true },
  fileType: { type: String },
  uploadedBy: { type: String, required: true }, // Auth service userId
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('Material', MaterialSchema);
