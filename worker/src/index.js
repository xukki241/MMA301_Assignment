const url = require('url');
const path = require('path');
const mongoose = require('mongoose');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { Worker, Queue } = require('bullmq');
const {
  Class,
  Enrollment,
  Topic,
  Exercise,
  Submission,
  AlertThreshold,
  AttendanceLog,
  StudentPerformanceMetrics,
  AlertLog
} = require('./models');

// Configuration
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms-core-db';
const REDIS_URI = process.env.REDIS_URI || 'redis://localhost:6379';
const NOTIFICATION_SVC_GRPC = process.env.NOTIFICATION_SVC_GRPC || 'localhost:50052';

// 1. Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('Worker connected to MongoDB'))
  .catch(err => console.error('Worker MongoDB connection error:', err));

// 2. Parse Redis Connection
const parsedRedis = url.parse(REDIS_URI);
const redisConnection = {
  host: parsedRedis.hostname || 'localhost',
  port: parseInt(parsedRedis.port || '6379', 10),
  username: parsedRedis.auth ? parsedRedis.auth.split(':')[0] : undefined,
  password: parsedRedis.auth ? parsedRedis.auth.split(':')[1] : undefined
};

// 3. Configure gRPC client for notification-svc
const PROTO_PATH = path.join(__dirname, '../../proto/notification.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const notificationProto = grpc.loadPackageDefinition(packageDefinition).notification;
const notifClient = new notificationProto.NotificationService(
  NOTIFICATION_SVC_GRPC,
  grpc.credentials.createInsecure()
);

// Helper function to send gRPC notification
function sendNotification(studentId, riskLevel, currentAverage, missingCount) {
  return new Promise((resolve, reject) => {
    notifClient.SendNotification({
      userId: studentId,
      title: `Academic Risk Alert: ${riskLevel}`,
      message: `Your academic risk level in class is now ${riskLevel}. Current average: ${currentAverage.toFixed(1)}%, missing: ${missingCount}.`,
      type: 'alert',
      createdAt: new Date().toISOString()
    }, (err, response) => {
      if (err) {
        console.error(`Failed to send gRPC notification for student ${studentId}:`, err);
        return reject(err);
      }
      console.log(`gRPC notification sent successfully for student ${studentId}:`, response);
      resolve(response);
    });
  });
}

// 4. Analytics processing logic
async function processAnalytics() {
  console.log('Starting daily analytics job...');

  // A. Fetch all active classes
  const activeClasses = await Class.find({ status: 'active' });
  console.log(`Found ${activeClasses.length} active classes for processing.`);

  for (const targetClass of activeClasses) {
    const classId = targetClass._id;

    // B. Fetch all enrolled students
    const enrollments = await Enrollment.find({ classId, status: 'enrolled' });
    if (enrollments.length === 0) {
      console.log(`Class ${targetClass.name} (${classId}) has no enrolled students.`);
      continue;
    }

    // C. Fetch all exercises in the class (via topics)
    const topics = await Topic.find({ classId });
    const topicIds = topics.map(t => t._id);
    const exercises = await Exercise.find({ topicId: { $in: topicIds } });
    const exerciseIds = exercises.map(e => e._id);

    // D. Fetch class alert thresholds
    const thresholds = await AlertThreshold.find({ classId });

    for (const enrollment of enrollments) {
      const studentId = enrollment.studentId;

      // 1. Calculate currentAverage
      // Get all student's submissions for class exercises
      const studentSubmissions = await Submission.find({
        exerciseId: { $in: exerciseIds },
        studentId
      });

      let gradedPointsSum = 0;
      let gradedMaxPointsSum = 0;
      let gradedCount = 0;

      for (const sub of studentSubmissions) {
        if (sub.status === 'graded' || sub.points !== undefined) {
          const matchingExercise = exercises.find(e => e._id.toString() === sub.exerciseId.toString());
          const maxPoints = (matchingExercise && matchingExercise.maxPoints) || 100;
          gradedPointsSum += sub.points;
          gradedMaxPointsSum += maxPoints;
          gradedCount++;
        }
      }

      // We define average percentage score
      const currentAverage = gradedMaxPointsSum > 0 ? (gradedPointsSum / gradedMaxPointsSum) * 100 : 0;

      // 2. Calculate missingCount
      // Number of exercises where the due date is past and the student has no submission
      const now = new Date();
      let missingCount = 0;

      for (const exercise of exercises) {
        if (exercise.dueDate && new Date(exercise.dueDate) < now) {
          const hasSubmission = studentSubmissions.some(
            sub => sub.exerciseId.toString() === exercise._id.toString()
          );
          if (!hasSubmission) {
            missingCount++;
          }
        }
      }

      // 3. Calculate attendanceRate
      const attendanceLogs = await AttendanceLog.find({ classId, studentId });
      let attendanceRate = 100;
      if (attendanceLogs.length > 0) {
        const attendedCount = attendanceLogs.filter(
          log => ['present', 'late', 'excused'].includes(log.status)
        ).length;
        attendanceRate = (attendedCount / attendanceLogs.length) * 100;
      }

      // 4. Calculate assignmentCompletionRate
      const totalExercisesCount = exercises.length;
      const assignmentCompletionRate = totalExercisesCount > 0 ? (studentSubmissions.length / totalExercisesCount) * 100 : 100;

      // 5. Evaluate riskLevel
      let riskLevel = 'Good'; // Default
      let alertSeverity = null;
      let alertMsg = '';

      // Fallback thresholds
      let minPassingGrade = 60;
      let maxMissingAssignments = 3;
      let minAttendanceRate = 80;

      // Check DB thresholds first
      const gradesThreshold = thresholds.find(t => t.metricType === 'grades');
      const submissionsThreshold = thresholds.find(t => t.metricType === 'submissions');
      const attendanceThreshold = thresholds.find(t => t.metricType === 'attendance');

      if (gradesThreshold) minPassingGrade = gradesThreshold.thresholdValue;
      if (submissionsThreshold) maxMissingAssignments = submissionsThreshold.thresholdValue;
      if (attendanceThreshold) minAttendanceRate = attendanceThreshold.thresholdValue;

      // Evaluate breaches
      let breaches = [];

      if (currentAverage < minPassingGrade) {
        breaches.push({
          type: 'grades',
          msg: `Average grade ${currentAverage.toFixed(1)}% is below minimum of ${minPassingGrade}%.`,
          severity: gradesThreshold ? gradesThreshold.severity : 'medium'
        });
      }

      if (missingCount > maxMissingAssignments) {
        breaches.push({
          type: 'submissions',
          msg: `Missing assignments ${missingCount} exceed maximum allowed of ${maxMissingAssignments}.`,
          severity: submissionsThreshold ? submissionsThreshold.severity : 'medium'
        });
      }

      if (attendanceRate < minAttendanceRate) {
        breaches.push({
          type: 'attendance',
          msg: `Attendance rate ${attendanceRate.toFixed(1)}% is below minimum of ${minAttendanceRate}%.`,
          severity: attendanceThreshold ? attendanceThreshold.severity : 'medium'
        });
      }

      if (breaches.length > 0) {
        // Determine risk level based on severity
        // If any breach is 'high', riskLevel is 'Critical'
        // Otherwise 'Warning'
        const hasHigh = breaches.some(b => b.severity === 'high');
        riskLevel = hasHigh ? 'Critical' : 'Warning';
        alertSeverity = hasHigh ? 'high' : 'medium';
        alertMsg = breaches.map(b => b.msg).join(' ');
      }

      // 6. Save or update StudentPerformanceMetrics
      // Fetch previous metric to see if risk level changed
      const prevMetric = await StudentPerformanceMetrics.findOne({ classId, studentId });
      const prevRiskLevel = prevMetric ? prevMetric.riskLevel : 'Good';

      await StudentPerformanceMetrics.findOneAndUpdate(
        { classId, studentId },
        {
          attendanceRate,
          assignmentCompletionRate,
          averageGrade: currentAverage, // averageGrade maps to currentAverage
          currentAverage,
          missingCount,
          riskLevel,
          lastUpdated: new Date()
        },
        { upsert: true, new: true }
      );

      // 7. If risk level changes OR goes to Warning/Critical, log alert and send gRPC notification
      const riskLevelChanged = prevRiskLevel !== riskLevel;
      const isRiskAtLeastWarning = riskLevel === 'Warning' || riskLevel === 'Critical';

      if (riskLevelChanged || isRiskAtLeastWarning) {
        console.log(`Alert triggered for Student ${studentId} in Class ${targetClass.name}. Risk level: ${riskLevel}. Reason: ${alertMsg || 'None'}`);

        // Write to AlertLog
        const alertLog = new AlertLog({
          classId,
          studentId,
          alertType: breaches.length > 0 ? breaches[0].type : 'academic_risk',
          message: alertMsg || `Student is at ${riskLevel} risk level.`,
          severity: alertSeverity || 'medium',
          status: 'unread',
          createdAt: new Date()
        });
        await alertLog.save();

        // Enqueue notification via gRPC stream client call
        try {
          await sendNotification(studentId, riskLevel, currentAverage, missingCount);
        } catch (grpcErr) {
          console.error(`gRPC error during notification dispatch: ${grpcErr.message}`);
        }
      }
    }
  }

  console.log('Daily analytics job completed successfully.');
}

// 5. Initialize BullMQ Worker
const worker = new Worker('analytics', async (job) => {
  console.log(`Processing job ${job.id} of name ${job.name}`);
  if (job.name === 'daily-analytics') {
    await processAnalytics();
  }
}, { connection: redisConnection });

worker.on('completed', (job) => {
  console.log(`Job ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} has failed with error: ${err.message}`);
});

console.log('LMS Background Worker initialized and listening for jobs in "analytics" queue...');

// For development convenience/triggering
module.exports = {
  processAnalytics,
  redisConnection,
  worker
};
