const mongoose = require('mongoose');
const { Schema } = mongoose;

const EnrollmentSchema = new Schema({
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  studentId: { type: String, required: true }, // Auth service userId
  status: { type: String, enum: ['enrolled', 'dropped'], default: 'enrolled' },
  enrolledAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('Enrollment', EnrollmentSchema);
