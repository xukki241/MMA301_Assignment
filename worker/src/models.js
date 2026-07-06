const mongoose = require('mongoose');
const { Schema } = mongoose;

const ClassSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  classCode: { type: String, required: true, unique: true },
  teacherId: { type: String, required: true },
  status: { type: String, enum: ['active', 'archived'], default: 'active' }
}, { timestamps: true });

const EnrollmentSchema = new Schema({
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  studentId: { type: String, required: true },
  status: { type: String, enum: ['enrolled', 'dropped'], default: 'enrolled' }
}, { timestamps: true });

const TopicSchema = new Schema({
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  title: { type: String, required: true }
}, { timestamps: true });

const ExerciseSchema = new Schema({
  topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
  title: { type: String, required: true },
  dueDate: { type: Date },
  maxPoints: { type: Number, default: 100 }
}, { timestamps: true });

const SubmissionSchema = new Schema({
  exerciseId: { type: Schema.Types.ObjectId, ref: 'Exercise', required: true },
  studentId: { type: String, required: true },
  status: { type: String, enum: ['submitted', 'graded', 'late'], default: 'submitted' },
  points: { type: Number }
}, { timestamps: true });

const AlertThresholdSchema = new Schema({
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  metricType: { type: String, enum: ['attendance', 'grades', 'submissions'], required: true },
  thresholdValue: { type: Number, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
}, { timestamps: true });

const AttendanceLogSchema = new Schema({
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  studentId: { type: String, required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['present', 'absent', 'late', 'excused'], required: true }
}, { timestamps: true });

const StudentPerformanceMetricsSchema = new Schema({
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  studentId: { type: String, required: true },
  attendanceRate: { type: Number, default: 100 },
  assignmentCompletionRate: { type: Number, default: 100 },
  averageGrade: { type: Number, default: 0 },
  currentAverage: { type: Number, default: 0 },
  missingCount: { type: Number, default: 0 },
  riskLevel: { type: String, enum: ['Good', 'Warning', 'Critical'], default: 'Good' },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

const AlertLogSchema = new Schema({
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  studentId: { type: String, required: true },
  alertType: { type: String, required: true },
  message: { type: String, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['unread', 'read', 'resolved'], default: 'unread' }
}, { timestamps: true });

module.exports = {
  Class: mongoose.model('Class', ClassSchema),
  Enrollment: mongoose.model('Enrollment', EnrollmentSchema),
  Topic: mongoose.model('Topic', TopicSchema),
  Exercise: mongoose.model('Exercise', ExerciseSchema),
  Submission: mongoose.model('Submission', SubmissionSchema),
  AlertThreshold: mongoose.model('AlertThreshold', AlertThresholdSchema),
  AttendanceLog: mongoose.model('AttendanceLog', AttendanceLogSchema),
  StudentPerformanceMetrics: mongoose.model('StudentPerformanceMetrics', StudentPerformanceMetricsSchema),
  AlertLog: mongoose.model('AlertLog', AlertLogSchema)
};
