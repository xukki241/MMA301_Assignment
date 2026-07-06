import { Document, Schema, Types, model } from 'mongoose';

// ─── Class ────────────────────────────────────────────────────────────────────
export interface IClass extends Document {
  name: string;
  description?: string;
  classCode: string;
  teacherId: string;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}
const ClassSchema = new Schema<IClass>(
  {
    name: { type: String, required: true },
    description: { type: String },
    classCode: { type: String, required: true, unique: true },
    teacherId: { type: String, required: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
  },
  { timestamps: true }
);
export const Class = model<IClass>('Class', ClassSchema);

// ─── Enrollment ───────────────────────────────────────────────────────────────
export interface IEnrollment extends Document {
  classId: Types.ObjectId;
  studentId: string;
  status: 'enrolled' | 'dropped';
  enrolledAt: Date;
}
const EnrollmentSchema = new Schema<IEnrollment>(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    studentId: { type: String, required: true },
    status: { type: String, enum: ['enrolled', 'dropped'], default: 'enrolled' },
    enrolledAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
export const Enrollment = model<IEnrollment>('Enrollment', EnrollmentSchema);

// ─── Topic ────────────────────────────────────────────────────────────────────
export interface ITopic extends Document {
  classId: Types.ObjectId;
  title: string;
  description?: string;
  order: number;
}
const TopicSchema = new Schema<ITopic>(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    title: { type: String, required: true },
    description: { type: String },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);
export const Topic = model<ITopic>('Topic', TopicSchema);

// ─── Material ─────────────────────────────────────────────────────────────────
export interface IMaterial extends Document {
  topicId: Types.ObjectId;
  title: string;
  description?: string;
  fileUrl: string;
  fileType?: string;
  uploadedBy: string;
}
const MaterialSchema = new Schema<IMaterial>(
  {
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
    title: { type: String, required: true },
    description: { type: String },
    fileUrl: { type: String, required: true },
    fileType: { type: String },
    uploadedBy: { type: String, required: true },
  },
  { timestamps: true }
);
export const Material = model<IMaterial>('Material', MaterialSchema);

// ─── Exercise ─────────────────────────────────────────────────────────────────
export interface IExercise extends Document {
  topicId: Types.ObjectId;
  title: string;
  description?: string;
  dueDate?: Date;
  maxPoints: number;
  createdBy: string;
}
const ExerciseSchema = new Schema<IExercise>(
  {
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
    title: { type: String, required: true },
    description: { type: String },
    dueDate: { type: Date },
    maxPoints: { type: Number, default: 100 },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);
export const Exercise = model<IExercise>('Exercise', ExerciseSchema);

// ─── Submission ───────────────────────────────────────────────────────────────
export interface ISubmission extends Document {
  exerciseId: Types.ObjectId;
  studentId: string;
  submittedAt: Date;
  status: 'submitted' | 'graded' | 'late';
  points?: number;
  feedback?: string;
}
const SubmissionSchema = new Schema<ISubmission>(
  {
    exerciseId: { type: Schema.Types.ObjectId, ref: 'Exercise', required: true },
    studentId: { type: String, required: true },
    submittedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['submitted', 'graded', 'late'], default: 'submitted' },
    points: { type: Number },
    feedback: { type: String },
  },
  { timestamps: true }
);
export const Submission = model<ISubmission>('Submission', SubmissionSchema);

// ─── SubmissionFile ───────────────────────────────────────────────────────────
export interface ISubmissionFile extends Document {
  submissionId: Types.ObjectId;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  uploadedAt: Date;
}
const SubmissionFileSchema = new Schema<ISubmissionFile>(
  {
    submissionId: { type: Schema.Types.ObjectId, ref: 'Submission', required: true },
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
export const SubmissionFile = model<ISubmissionFile>('SubmissionFile', SubmissionFileSchema);

// ─── Grade ────────────────────────────────────────────────────────────────────
export interface IGrade extends Document {
  submissionId: Types.ObjectId;
  gradedBy: string;
  points: number;
  feedback?: string;
  gradedAt: Date;
}
const GradeSchema = new Schema<IGrade>(
  {
    submissionId: { type: Schema.Types.ObjectId, ref: 'Submission', required: true },
    gradedBy: { type: String, required: true },
    points: { type: Number, required: true },
    feedback: { type: String },
    gradedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
export const Grade = model<IGrade>('Grade', GradeSchema);

// ─── ClassPost ────────────────────────────────────────────────────────────────
export interface IClassPost extends Document {
  classId: Types.ObjectId;
  authorId: string;
  content: string;
  attachmentUrls: string[];
}
const ClassPostSchema = new Schema<IClassPost>(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    authorId: { type: String, required: true },
    content: { type: String, required: true },
    attachmentUrls: { type: [String], default: [] },
  },
  { timestamps: true }
);
export const ClassPost = model<IClassPost>('ClassPost', ClassPostSchema);

// ─── PostComment ──────────────────────────────────────────────────────────────
export interface IPostComment extends Document {
  postId: Types.ObjectId;
  authorId: string;
  content: string;
}
const PostCommentSchema = new Schema<IPostComment>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'ClassPost', required: true },
    authorId: { type: String, required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);
export const PostComment = model<IPostComment>('PostComment', PostCommentSchema);

// ─── PrivateNote ──────────────────────────────────────────────────────────────
export interface IPrivateNote extends Document {
  submissionId: Types.ObjectId;
  senderId: string;
  receiverId: string;
  content: string;
}
const PrivateNoteSchema = new Schema<IPrivateNote>(
  {
    submissionId: { type: Schema.Types.ObjectId, ref: 'Submission', required: true },
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);
export const PrivateNote = model<IPrivateNote>('PrivateNote', PrivateNoteSchema);

// ─── Notification ─────────────────────────────────────────────────────────────
export interface INotification extends Document {
  userId: string;
  title: string;
  content: string;
  isRead: boolean;
  type: string;
}
const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    type: { type: String, default: 'general' },
  },
  { timestamps: true }
);
export const Notification = model<INotification>('Notification', NotificationSchema);

// ─── AlertLog ─────────────────────────────────────────────────────────────────
export interface IAlertLog extends Document {
  classId: Types.ObjectId;
  studentId: string;
  alertType: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  status: 'unread' | 'read' | 'resolved';
}
const AlertLogSchema = new Schema<IAlertLog>(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    studentId: { type: String, required: true },
    alertType: { type: String, required: true },
    message: { type: String, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { type: String, enum: ['unread', 'read', 'resolved'], default: 'unread' },
  },
  { timestamps: true }
);
export const AlertLog = model<IAlertLog>('AlertLog', AlertLogSchema);

// ─── AlertThreshold ───────────────────────────────────────────────────────────
export interface IAlertThreshold extends Document {
  classId: Types.ObjectId;
  metricType: 'attendance' | 'grades' | 'submissions';
  thresholdValue: number;
  severity: 'low' | 'medium' | 'high';
}
const AlertThresholdSchema = new Schema<IAlertThreshold>(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    metricType: { type: String, enum: ['attendance', 'grades', 'submissions'], required: true },
    thresholdValue: { type: Number, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  },
  { timestamps: true }
);
export const AlertThreshold = model<IAlertThreshold>('AlertThreshold', AlertThresholdSchema);

// ─── AttendanceLog ────────────────────────────────────────────────────────────
export interface IAttendanceLog extends Document {
  classId: Types.ObjectId;
  studentId: string;
  date: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
  recordedBy: string;
}
const AttendanceLogSchema = new Schema<IAttendanceLog>(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    studentId: { type: String, required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['present', 'absent', 'late', 'excused'], required: true },
    recordedBy: { type: String, required: true },
  },
  { timestamps: true }
);
export const AttendanceLog = model<IAttendanceLog>('AttendanceLog', AttendanceLogSchema);

// ─── StudentPerformanceMetrics ────────────────────────────────────────────────
export interface IStudentPerformanceMetrics extends Document {
  classId: Types.ObjectId;
  studentId: string;
  attendanceRate: number;
  assignmentCompletionRate: number;
  averageGrade: number;
  currentAverage: number;
  missingCount: number;
  riskLevel: 'Good' | 'Warning' | 'Critical';
  lastUpdated: Date;
}
const StudentPerformanceMetricsSchema = new Schema<IStudentPerformanceMetrics>(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    studentId: { type: String, required: true },
    attendanceRate: { type: Number, default: 100 },
    assignmentCompletionRate: { type: Number, default: 100 },
    averageGrade: { type: Number, default: 0 },
    currentAverage: { type: Number, default: 0 },
    missingCount: { type: Number, default: 0 },
    riskLevel: { type: String, enum: ['Good', 'Warning', 'Critical'], default: 'Good' },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
export const StudentPerformanceMetrics = model<IStudentPerformanceMetrics>(
  'StudentPerformanceMetrics',
  StudentPerformanceMetricsSchema
);

// ─── SystemLog ────────────────────────────────────────────────────────────────
export interface ISystemLog extends Document {
  serviceName: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: any;
  timestamp: Date;
  createdAt?: Date;
}
const SystemLogSchema = new Schema<ISystemLog>(
  {
    serviceName: { type: String, default: 'core-api' },
    level: { type: String, enum: ['info', 'warn', 'error', 'debug'], default: 'info' },
    message: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
export const SystemLog = model<ISystemLog>('SystemLog', SystemLogSchema);

// ─── ClassSettings ────────────────────────────────────────────────────────────
export interface IClassSettings extends Document {
  classId: Types.ObjectId;
  allowStudentPosts: boolean;
  allowStudentComments: boolean;
  theme: string;
  updatedAt?: Date;
}
const ClassSettingsSchema = new Schema<IClassSettings>(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, unique: true },
    allowStudentPosts: { type: Boolean, default: true },
    allowStudentComments: { type: Boolean, default: true },
    theme: { type: String, default: 'default' },
  },
  { timestamps: true }
);
export const ClassSettings = model<IClassSettings>('ClassSettings', ClassSettingsSchema);

// ─── DeviceToken ──────────────────────────────────────────────────────────────
export interface IDeviceToken extends Document {
  userId: string;
  token: string;
  deviceType: 'ios' | 'android' | 'web';
}
const DeviceTokenSchema = new Schema<IDeviceToken>(
  {
    userId: { type: String, required: true },
    token: { type: String, required: true },
    deviceType: { type: String, enum: ['ios', 'android', 'web'], default: 'web' },
  },
  { timestamps: true }
);
export const DeviceToken = model<IDeviceToken>('DeviceToken', DeviceTokenSchema);

// ─── QuizBank ─────────────────────────────────────────────────────────────────
export interface IQuizBank extends Document {
  classId: Types.ObjectId;
  title: string;
  questions: any[];
  createdBy: string;
}
const QuizBankSchema = new Schema<IQuizBank>(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    title: { type: String, required: true },
    questions: { type: Schema.Types.Mixed, default: [] },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);
export const QuizBank = model<IQuizBank>('QuizBank', QuizBankSchema);
