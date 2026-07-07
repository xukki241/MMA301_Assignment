import bcrypt from 'bcryptjs';
import mongoose, { Schema, Types } from 'mongoose';
import {
  AlertLog,
  AlertThreshold,
  AttendanceLog,
  Class,
  ClassPost,
  ClassSettings,
  DeviceToken,
  Enrollment,
  Exercise,
  Grade,
  Material,
  Notification,
  PostComment,
  PrivateNote,
  QuizBank,
  StudentPerformanceMetrics,
  Submission,
  SubmissionFile,
  SystemLog,
  Topic,
} from '../models/index';

const CORE_MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms-core-db';
const AUTH_MONGO_URI = process.env.AUTH_MONGO_URI || 'mongodb://localhost:27017/lms-auth-db';
const PASSWORD = process.env.DEMO_PASSWORD || 'Password123!';
const now = new Date('2026-07-07T00:00:00.000Z');

const oid = (value: string) => new Types.ObjectId(value);

const roles = [
  { _id: '64a000000000000000000001', roleName: 'Admin' },
  { _id: '64a000000000000000000002', roleName: 'Teacher' },
  { _id: '64a000000000000000000003', roleName: 'Student' },
];

const users = [
  { _id: '64b000000000000000000001', email: 'admin@example.com', fullName: 'Demo Admin', role: 'Admin' },
  { _id: '64b000000000000000000002', email: 'teacher@example.com', fullName: 'Primary Demo Teacher', role: 'Teacher' },
  { _id: '64b000000000000000000003', email: 'student@example.com', fullName: 'Primary Demo Student', role: 'Student' },
  ...Array.from({ length: 5 }, (_, index) => ({
    _id: `64b00000000000000000001${index + 1}`,
    email: `teacher${index + 1}@example.com`,
    fullName: `Demo Teacher ${index + 1}`,
    role: 'Teacher',
  })),
  ...Array.from({ length: 14 }, (_, index) => ({
    _id: `64b0000000000000000001${(index + 1).toString(16).padStart(2, '0')}`,
    email: `student${index + 1}@example.com`,
    fullName: `Demo Student ${index + 1}`,
    role: 'Student',
  })),
];

const classRows = [
  { _id: '64c000000000000000000001', name: 'MMA301 Analytics Foundations', classCode: 'LMS101', teacherId: users[3]._id },
  { _id: '64c000000000000000000002', name: 'Backend Systems for LMS', classCode: 'LMS102', teacherId: users[4]._id },
  { _id: '64c000000000000000000003', name: 'Mobile Learning Experience', classCode: 'LMS103', teacherId: users[5]._id },
  { _id: '64c000000000000000000004', name: 'Data Engineering for Education', classCode: 'LMS104', teacherId: users[6]._id },
  { _id: '64c000000000000000000005', name: 'Assessment and Feedback', classCode: 'LMS105', teacherId: users[7]._id },
];

const numberedStudents = users.filter((user) => user.email.startsWith('student'));

async function seedAuthDb() {
  const authConnection = await mongoose.createConnection(AUTH_MONGO_URI).asPromise();
  const User = authConnection.model(
    'User',
    new Schema(
      {
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        passwordHash: String,
        fullName: { type: String, required: true, trim: true },
        avatarURL: { type: String, default: null },
        cognitoSub: { type: String, unique: true, sparse: true },
        isActive: { type: Boolean, default: true },
      },
      { timestamps: true }
    )
  );
  const Role = authConnection.model('Role', new Schema({ roleName: { type: String, required: true, unique: true, trim: true } }, { timestamps: { createdAt: true, updatedAt: false } }));
  const UserRole = authConnection.model(
    'UserRole',
    new Schema(
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
      },
      { timestamps: { createdAt: true, updatedAt: false } }
    ).index({ userId: 1, roleId: 1 }, { unique: true })
  );

  await UserRole.deleteMany({ userId: { $in: users.map((user) => oid(user._id)) } });
  await User.deleteMany({ _id: { $in: users.map((user) => oid(user._id)) } });
  await Role.deleteMany({ _id: { $in: roles.map((role) => oid(role._id)) } });

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  await Role.insertMany(roles.map((role) => ({ _id: oid(role._id), roleName: role.roleName, createdAt: now })));
  await User.insertMany(
    users.map((user) => ({
      _id: oid(user._id),
      email: user.email,
      fullName: user.fullName,
      passwordHash,
      avatarURL: null,
      cognitoSub: `demo-${user.email}`,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }))
  );
  await UserRole.insertMany(
    users.map((user, index) => ({
      _id: oid(`64d000000000000000000${(index + 1).toString(16).padStart(3, '0')}`),
      userId: oid(user._id),
      roleId: oid(roles.find((role) => role.roleName === user.role)!._id),
      createdAt: now,
    }))
  );

  await authConnection.close();
}

async function resetCoreDb() {
  const classIds = classRows.map((row) => oid(row._id));
  const demoIdRange = { $gte: oid('650000000000000000000000'), $lt: oid('665000000000000000000000') };
  await Promise.all([
    PrivateNote.deleteMany({ _id: demoIdRange }),
    Grade.deleteMany({ _id: demoIdRange }),
    SubmissionFile.deleteMany({ _id: demoIdRange }),
    Submission.deleteMany({ _id: demoIdRange }),
    Exercise.deleteMany({ _id: demoIdRange }),
    Material.deleteMany({ _id: demoIdRange }),
    Topic.deleteMany({ _id: demoIdRange }),
    PostComment.deleteMany({ _id: demoIdRange }),
    ClassPost.deleteMany({ _id: demoIdRange }),
    AttendanceLog.deleteMany({ classId: { $in: classIds } }),
    AlertLog.deleteMany({ classId: { $in: classIds } }),
    AlertThreshold.deleteMany({ classId: { $in: classIds } }),
    StudentPerformanceMetrics.deleteMany({ classId: { $in: classIds } }),
    ClassSettings.deleteMany({ classId: { $in: classIds } }),
    QuizBank.deleteMany({ classId: { $in: classIds } }),
    Enrollment.deleteMany({ classId: { $in: classIds } }),
    Class.deleteMany({ _id: { $in: classIds } }),
    Notification.deleteMany({ userId: { $in: numberedStudents.map((student) => student._id) } }),
    DeviceToken.deleteMany({ userId: { $in: numberedStudents.map((student) => student._id) } }),
    SystemLog.deleteMany({ _id: demoIdRange, serviceName: 'seed-mongo' }),
  ]);
}

async function seedCoreDb() {
  await mongoose.connect(CORE_MONGO_URI);
  await resetCoreDb();

  await Class.insertMany(
    classRows.map((row) => ({
      _id: oid(row._id),
      name: row.name,
      description: 'Medium demo class generated by reset-dev seed.',
      classCode: row.classCode,
      teacherId: row.teacherId,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }))
  );

  for (const [classIndex, classRow] of classRows.entries()) {
    const classId = oid(classRow._id);
    const classStudents = numberedStudents.slice(classIndex * 2, classIndex * 2 + 6);

    await ClassSettings.create({ _id: oid(`65000000000000000000000${classIndex + 1}`), classId, allowStudentPosts: true, allowStudentComments: true, theme: 'default', createdAt: now, updatedAt: now });
    await AlertThreshold.insertMany([
      { _id: oid(`65100000000000000000000${classIndex + 1}`), classId, metricType: 'attendance', thresholdValue: 75, severity: 'medium', createdAt: now, updatedAt: now },
      { _id: oid(`65200000000000000000000${classIndex + 1}`), classId, metricType: 'grades', thresholdValue: 60, severity: 'high', createdAt: now, updatedAt: now },
      { _id: oid(`65300000000000000000000${classIndex + 1}`), classId, metricType: 'submissions', thresholdValue: 80, severity: 'low', createdAt: now, updatedAt: now },
    ]);

    await Enrollment.insertMany(
      classStudents.map((student, studentIndex) => ({
        _id: oid(`65400000000000000000${classIndex + 1}${(studentIndex + 1).toString().padStart(3, '0')}`),
        classId,
        studentId: student._id,
        status: 'enrolled',
        enrolledAt: now,
        createdAt: now,
        updatedAt: now,
      }))
    );
    await AttendanceLog.insertMany(
      classStudents.map((student, studentIndex) => ({
        _id: oid(`65500000000000000000${classIndex + 1}${(studentIndex + 1).toString().padStart(3, '0')}`),
        classId,
        studentId: student._id,
        date: now,
        status: studentIndex % 5 === 0 ? 'late' : 'present',
        recordedBy: classRow.teacherId,
        createdAt: now,
        updatedAt: now,
      }))
    );
    await StudentPerformanceMetrics.insertMany(
      classStudents.map((student, studentIndex) => {
        const averageGrade = 72 + studentIndex * 3;
        return {
          _id: oid(`65600000000000000000${classIndex + 1}${(studentIndex + 1).toString().padStart(3, '0')}`),
          classId,
          studentId: student._id,
          attendanceRate: 82 + studentIndex,
          assignmentCompletionRate: 78 + studentIndex,
          averageGrade,
          currentAverage: averageGrade,
          missingCount: studentIndex % 3,
          riskLevel: studentIndex > 4 ? 'Warning' : 'Good',
          lastUpdated: now,
          createdAt: now,
          updatedAt: now,
        };
      })
    );

    const topicRows = [1, 2].map((topicNumber) => ({
      _id: `65700000000000000000${classIndex + 1}00${topicNumber}`,
      classId,
      title: topicNumber === 1 ? 'Getting Started' : 'Applied Practice',
      description: `Seeded topic ${topicNumber}`,
      order: topicNumber,
    }));
    await Topic.insertMany(topicRows.map((topic) => ({ ...topic, _id: oid(topic._id), createdAt: now, updatedAt: now })));

    for (const [topicIndex, topic] of topicRows.entries()) {
      const exerciseId = oid(`65800000000000000000${classIndex + 1}00${topicIndex + 1}`);
      await Material.create({ _id: oid(`65900000000000000000${classIndex + 1}00${topicIndex + 1}`), topicId: oid(topic._id), title: `Lecture Notes ${topicIndex + 1}`, description: 'Seeded PDF material', fileUrl: `s3://lms-uploads/materials/${classRow.classCode}-${topicIndex + 1}.pdf`, fileType: 'pdf', uploadedBy: classRow.teacherId, createdAt: now, updatedAt: now });
      await Exercise.create({ _id: exerciseId, topicId: oid(topic._id), title: `Assignment ${topicIndex + 1}`, description: 'Seeded assignment', dueDate: new Date(now.getTime() + (topicIndex + 7) * 24 * 60 * 60 * 1000), maxPoints: 100, createdBy: classRow.teacherId, createdAt: now, updatedAt: now });

      if (classIndex === 0 && topicIndex === 0) {
        for (const [studentIndex, student] of classStudents.entries()) {
          const submissionId = oid(`65a00000000000000000000${studentIndex + 1}`);
          await Submission.create({ _id: submissionId, exerciseId, studentId: student._id, submittedAt: now, status: 'graded', points: 70 + studentIndex * 4, feedback: 'Seeded feedback', createdAt: now, updatedAt: now });
          await SubmissionFile.create({ _id: oid(`65b00000000000000000000${studentIndex + 1}`), submissionId, fileUrl: `s3://lms-uploads/submissions/${student._id}.pdf`, fileName: `${student._id}-assignment.pdf`, fileSize: 2048 + studentIndex, uploadedAt: now, createdAt: now, updatedAt: now });
          await Grade.create({ _id: oid(`65c00000000000000000000${studentIndex + 1}`), submissionId, gradedBy: classRow.teacherId, points: 70 + studentIndex * 4, feedback: 'Good progress.', gradedAt: now, createdAt: now, updatedAt: now });
          await PrivateNote.create({ _id: oid(`65d00000000000000000000${studentIndex + 1}`), submissionId, senderId: classRow.teacherId, receiverId: student._id, content: 'Private seeded note for follow-up.', createdAt: now, updatedAt: now });
        }
      }
    }

    const postId = oid(`65e00000000000000000000${classIndex + 1}`);
    await ClassPost.create({ _id: postId, classId, authorId: classRow.teacherId, content: 'Welcome to the seeded demo class.', attachmentUrls: [], createdAt: now, updatedAt: now });
    await PostComment.create({ _id: oid(`65f00000000000000000000${classIndex + 1}`), postId, authorId: classStudents[0]._id, content: 'Thank you, teacher!', createdAt: now, updatedAt: now });
    await QuizBank.create({ _id: oid(`66000000000000000000000${classIndex + 1}`), classId, title: 'Demo Quiz Bank', questions: [{ prompt: 'What is LMS?', answer: 'Learning Management System' }], createdBy: classRow.teacherId, createdAt: now, updatedAt: now });
  }

  await Notification.insertMany(numberedStudents.slice(0, 8).map((student, index) => ({ _id: oid(`66100000000000000000000${index + 1}`), userId: student._id, title: 'Demo notification', content: `Seeded notification ${index + 1}`, isRead: false, type: 'general', createdAt: now, updatedAt: now })));
  await DeviceToken.insertMany(numberedStudents.slice(0, 3).map((student, index) => ({ _id: oid(`66200000000000000000000${index + 1}`), userId: student._id, token: `demo-device-token-${index + 1}`, deviceType: ['web', 'ios', 'android'][index], createdAt: now, updatedAt: now })));
  await AlertLog.create({ _id: oid('663000000000000000000001'), classId: oid(classRows[0]._id), studentId: numberedStudents[0]._id, alertType: 'grades', message: 'Seeded grade alert', severity: 'medium', status: 'unread', createdAt: now, updatedAt: now });
  await SystemLog.create({ _id: oid('664000000000000000000001'), serviceName: 'seed-mongo', level: 'info', message: 'Seeded MongoDB full demo data', metadata: { mode: 'reset-dev' }, timestamp: now, createdAt: now, updatedAt: now });

  await mongoose.disconnect();
}

async function seed() {
  await seedAuthDb();
  await seedCoreDb();
  console.log('Seeded MongoDB auth and core demo data.');
}

seed().catch(async (error) => {
  console.error('Mongo seed failed:', error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
