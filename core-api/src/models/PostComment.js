const mongoose = require('mongoose');
const { Schema } = mongoose;

const PostCommentSchema = new Schema({
  postId: { type: Schema.Types.ObjectId, ref: 'ClassPost', required: true },
  authorId: { type: String, required: true }, // Auth service userId
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('PostComment', PostCommentSchema);
