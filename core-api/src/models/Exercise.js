const mongoose = require('mongoose');
const { Schema } = mongoose;

const ExerciseSchema = new Schema({
  topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
  title: { type: String, required: true },
  description: { type: String },
  dueDate: { type: Date },
  maxPoints: { type: Number, default: 100 },
  createdBy: { type: String, required: true }, // Auth service userId
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('Exercise', ExerciseSchema);
