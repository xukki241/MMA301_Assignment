const mongoose = require('mongoose');
const { Schema } = mongoose;

const QuizBankSchema = new Schema({
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  title: { type: String, required: true },
  questions: { type: Schema.Types.Mixed, default: [] }, // Array/Mixed questions object
  createdBy: { type: String, required: true }, // Auth service userId
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('QuizBank', QuizBankSchema);
