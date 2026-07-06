const mongoose = require('mongoose');
const { Schema } = mongoose;

const AttendanceLogSchema = new Schema({
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  studentId: { type: String, required: true }, // Auth service userId
  date: { type: Date, required: true },
  status: { type: String, enum: ['present', 'absent', 'late', 'excused'], required: true },
  recordedBy: { type: String, required: true } // Auth service userId
}, {
  timestamps: true
});

module.exports = mongoose.model('AttendanceLog', AttendanceLogSchema);
