const mongoose = require('mongoose');
const { Schema } = mongoose;

const ClassSettingsSchema = new Schema({
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, unique: true },
  allowStudentPosts: { type: Boolean, default: true },
  allowStudentComments: { type: Boolean, default: true },
  theme: { type: String, default: 'default' },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('ClassSettings', ClassSettingsSchema);
