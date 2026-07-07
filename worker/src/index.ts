import url from 'url';
import path from 'path';
import mongoose, { Schema, model, Document, Types } from 'mongoose';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { Worker, Queue } from 'bullmq';

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface IClass extends Document {
  name: string;
  classCode: string;
  teacherId: string;
  status: string;
}
interface IEnrollment extends Document {
  classId: Types.ObjectId;
  studentId: string;
  status: string;
}
interface ITopic extends Document {
  classId: Types.ObjectId;
  title: string;
  order: number;
}
interface IExercise extends Document {
  topicId: Types.ObjectId;
  maxPoints: number;
  dueDate?: Date | null;
}
interface ISubmission extends Document {
  exerciseId: Types.ObjectId;
  studentId: string;
  points?: number;
  status: string;
}
interface IAlertThreshold extends Document {
  classId: Types.ObjectId;
  metricType: string;
  thresholdValue: number;
  severity: string;
}
interface IAttendanceLog extends Document {
  classId: Types.ObjectId;
  studentId: string;
  status: string;
  date: Date;
}
interface IStudentPerformanceMetrics extends Document {
  classId: Types.ObjectId;
  studentId: string;
  attendanceRate: number;
  averageGrade: number;
  currentAverage: number;
  missingCount: number;
  riskLevel: string;
  lastUpdated: Date;
}
interface IAlertLog extends Document {
  classId: Types.ObjectId;
  studentId: string;
  alertType: string;
  message: string;
  severity: string;
  status: string;
}

// ─── Models ───────────────────────────────────────────────────────────────────
const ClassSchema = new Schema<IClass>({
  name: { type: String, required: true },
  classCode: { type: String, required: true, unique: true },
  teacherId: { type: String, required: true },
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
}, { timestamps: true });

const EnrollmentSchema = new Schema<IEnrollment>({
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  studentId: { type: String, required: true },
  status: { type: String, enum: ['enrolled', 'dropped'], default: 'enrolled' },
}, { timestamps: true });

const TopicSchema = new Schema<ITopic>({
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  title: { type: String, required: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });

const ExerciseSchema = new Schema<IExercise>({
  topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
  maxPoints: { type: Number, default: 100 },
  dueDate: { type: Date },
}, { timestamps: true });

const SubmissionSchema = new Schema<ISubmission>({
  exerciseId: { type: Schema.Types.ObjectId, ref: 'Exercise', required: true },
  studentId: { type: String, required: true },
  status: { type: String, enum: ['submitted', 'graded', 'late'], default: 'submitted' },
  points: { type: Number },
}, { timestamps: true });

const AlertThresholdSchema = new Schema<IAlertThreshold>({
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  metricType: { type: String, enum: ['attendance', 'grades', 'submissions'], required: true },
  thresholdValue: { type: Number, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
}, { timestamps: true });

const AttendanceLogSchema = new Schema<IAttendanceLog>({
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  studentId: { type: String, required: true },
  status: { type: String, enum: ['present', 'absent', 'late', 'excused'], required: true },
  date: { type: Date, required: true },
}, { timestamps: true });

const StudentPerformanceMetricsSchema = new Schema<IStudentPerformanceMetrics>({
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  studentId: { type: String, required: true },
  attendanceRate: { type: Number, default: 100 },
  averageGrade: { type: Number, default: 0 },
  currentAverage: { type: Number, default: 0 },
  missingCount: { type: Number, default: 0 },
  riskLevel: { type: String, enum: ['Good', 'Warning', 'Critical'], default: 'Good' },
  lastUpdated: { type: Date, default: Date.now },
}, { timestamps: true });

const AlertLogSchema = new Schema<IAlertLog>({
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  studentId: { type: String, required: true },
  alertType: { type: String, required: true },
  message: { type: String, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['unread', 'read', 'resolved'], default: 'unread' },
}, { timestamps: true });

const Class = model<IClass>('Class', ClassSchema);
const Enrollment = model<IEnrollment>('Enrollment', EnrollmentSchema);
const Topic = model<ITopic>('Topic', TopicSchema);
const Exercise = model<IExercise>('Exercise', ExerciseSchema);
const Submission = model<ISubmission>('Submission', SubmissionSchema);
const AlertThreshold = model<IAlertThreshold>('AlertThreshold', AlertThresholdSchema);
const AttendanceLog = model<IAttendanceLog>('AttendanceLog', AttendanceLogSchema);
const StudentPerformanceMetrics = model<IStudentPerformanceMetrics>(
  'StudentPerformanceMetrics',
  StudentPerformanceMetricsSchema
);
const AlertLog = model<IAlertLog>('AlertLog', AlertLogSchema);

// ─── Configuration ────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms-db';
const REDIS_URI = process.env.REDIS_URI || 'redis://localhost:6379';
const NOTIFICATION_SVC_GRPC = process.env.NOTIFICATION_SVC_GRPC || 'localhost:50052';

// 1. Connect MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('Worker connected to MongoDB'))
  .catch((err) => console.error('Worker MongoDB connection error:', err));

// 2. Parse Redis connection
const parsedRedis = new url.URL(REDIS_URI);
const redisConnection = {
  host: parsedRedis.hostname || 'localhost',
  port: parseInt(parsedRedis.port || '6379', 10),
  username: parsedRedis.username || undefined,
  password: parsedRedis.password || undefined,
};

// 3. Configure gRPC client for notification-svc
const PROTO_PATH = path.join(__dirname, '../../proto/notification.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const notificationProto: any = grpc.loadPackageDefinition(packageDefinition).notification;
const notifClient = new notificationProto.NotificationService(
  NOTIFICATION_SVC_GRPC,
  grpc.credentials.createInsecure()
);

// ─── Helper: Send notification via gRPC ───────────────────────────────────────
function sendNotification(payload: {
  userId: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    notifClient.SendNotification(payload, (err: any, response: any) => {
      if (err) {
        console.error('gRPC notification error:', err);
        reject(err);
      } else {
        console.log(
          `gRPC notification sent successfully for student ${payload.userId}:`,
          response
        );
        resolve();
      }
    });
  });
}

// ─── Daily Analytics Job ──────────────────────────────────────────────────────
async function runDailyAnalyticsJob(): Promise<void> {
  console.log('Starting daily analytics job...');

  const activeClasses = await Class.find({ status: 'active' });
  console.log(`Found ${activeClasses.length} active classes for processing.`);

  for (const cls of activeClasses) {
    const enrollments = await Enrollment.find({ classId: cls._id, status: 'enrolled' });
    const thresholds = await AlertThreshold.find({ classId: cls._id });

    for (const enrollment of enrollments) {
      const { studentId } = enrollment;

      // Compute missing submissions for this class
      const topics = await Topic.find({ classId: cls._id });
      const topicIds = topics.map((t) => t._id);
      const exercises = await Exercise.find({ topicId: { $in: topicIds } });
      const submissions = await Submission.find({
        studentId,
        exerciseId: { $in: exercises.map((e) => e._id) },
      });
      const submittedIds = new Set(submissions.map((s) => s.exerciseId.toString()));
      const now = new Date();
      const missingCount = exercises.filter(
        (e) => !submittedIds.has(e._id.toString()) && e.dueDate && new Date(e.dueDate) < now
      ).length;

      // Compute average grade
      const gradedSubmissions = submissions.filter((s) => s.points !== undefined);
      const currentAverage =
        gradedSubmissions.length > 0
          ? gradedSubmissions.reduce((sum, s) => sum + (s.points || 0), 0) / gradedSubmissions.length
          : 0;

      // Compute attendance
      const allAttendance = await AttendanceLog.find({ classId: cls._id, studentId });
      const presentCount = allAttendance.filter((a) =>
        ['present', 'late'].includes(a.status)
      ).length;
      const attendanceRate =
        allAttendance.length > 0 ? (presentCount / allAttendance.length) * 100 : 100;

      // Determine risk level
      let riskLevel: 'Good' | 'Warning' | 'Critical' = 'Good';
      const alerts: string[] = [];

      for (const threshold of thresholds) {
        if (threshold.metricType === 'grades' && currentAverage < threshold.thresholdValue) {
          riskLevel = threshold.severity === 'high' ? 'Critical' : 'Warning';
          alerts.push(
            `Average grade ${currentAverage.toFixed(1)}% is below threshold of ${threshold.thresholdValue}%.`
          );
        }
        if (threshold.metricType === 'submissions' && missingCount > threshold.thresholdValue) {
          riskLevel = threshold.severity === 'high' ? 'Critical' : 'Warning';
          alerts.push(
            `Missing assignments ${missingCount} exceed maximum allowed of ${threshold.thresholdValue}.`
          );
        }
        if (threshold.metricType === 'attendance' && attendanceRate < threshold.thresholdValue) {
          if (riskLevel !== 'Critical') riskLevel = 'Warning';
          alerts.push(
            `Attendance rate ${attendanceRate.toFixed(1)}% is below minimum of ${threshold.thresholdValue}%.`
          );
        }
      }

      // Update metrics
      await StudentPerformanceMetrics.findOneAndUpdate(
        { classId: cls._id, studentId },
        {
          currentAverage,
          averageGrade: currentAverage,
          attendanceRate,
          missingCount,
          riskLevel,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true }
      );

      // Create alert logs and send notifications if risk
      if (riskLevel !== 'Good' && alerts.length > 0) {
        const alertMessage = alerts.join(' ');
        console.log(`Alert triggered for Student ${studentId} in Class ${cls.name}. Risk level: ${riskLevel}. Reason: ${alertMessage}`);

        await AlertLog.create({
          classId: cls._id,
          studentId,
          alertType: 'performance',
          message: alertMessage,
          severity: riskLevel === 'Critical' ? 'high' : 'medium',
          status: 'unread',
        });

        const notifPayload = {
          userId: studentId,
          title: `Academic Risk Alert: ${riskLevel}`,
          message: `Your academic risk level in class is now ${riskLevel}. Current average: ${currentAverage.toFixed(1)}%, missing: ${missingCount}.`,
          type: 'alert',
          createdAt: new Date().toISOString(),
        };

        try {
          await sendNotification(notifPayload);
        } catch (err) {
          console.error(`Failed to send notification to student ${studentId}:`, err);
        }
      }
    }
  }

  console.log('Daily analytics job completed successfully.');
}

// ─── BullMQ Worker ────────────────────────────────────────────────────────────
const analyticsQueue = new Queue('daily-analytics', { connection: redisConnection });

const worker = new Worker(
  'daily-analytics',
  async (_job) => {
    await runDailyAnalyticsJob();
  },
  { connection: redisConnection }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

// Schedule daily job (every 24h)
analyticsQueue
  .add('daily-run', {}, { repeat: { pattern: '0 0 * * *' } })
  .then(() => console.log('Daily analytics job scheduled'))
  .catch((err) => console.error('Failed to schedule job:', err));

console.log('Worker service started. Waiting for jobs...');

export { runDailyAnalyticsJob };
