const mongoose = require('mongoose');
const { Schema } = mongoose;

const StudentPerformanceMetricsSchema = new Schema({
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  studentId: { type: String, required: true }, // Auth service userId
  attendanceRate: { type: Number, default: 100 },
  assignmentCompletionRate: { type: Number, default: 100 },
  averageGrade: { type: Number, default: 0 },
  currentAverage: { type: Number, default: 0 },
  missingCount: { type: Number, default: 0 },
  riskLevel: { type: String, enum: ['Good', 'Warning', 'Critical'], default: 'Good' },
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('StudentPerformanceMetrics', StudentPerformanceMetricsSchema);
