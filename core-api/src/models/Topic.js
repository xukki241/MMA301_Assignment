const mongoose = require('mongoose');
const { Schema } = mongoose;

const TopicSchema = new Schema({
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  title: { type: String, required: true },
  description: { type: String },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('Topic', TopicSchema);
