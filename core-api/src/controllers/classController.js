const { Class, Enrollment, ClassSettings, AttendanceLog } = require('../models');
const { broadcastToClass } = require('../socket');

// Helper to generate a random 6-character class code
const generateClassCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

exports.createClass = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Class name is required' });
    }

    const classCode = generateClassCode();
    const newClass = new Class({
      name,
      description,
      classCode,
      teacherId: req.user.userId,
      status: 'active'
    });

    await newClass.save();

    // Create default settings for this class
    const settings = new ClassSettings({
      classId: newClass._id,
      allowStudentPosts: true,
      allowStudentComments: true,
      theme: 'default'
    });
    await settings.save();

    res.status(201).json({
      message: 'Class created successfully',
      class: newClass,
      settings
    });
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.joinClass = async (req, res) => {
  try {
    const { classCode } = req.body;
    if (!classCode) {
      return res.status(400).json({ message: 'Class code is required' });
    }

    const targetClass = await Class.findOne({ classCode: classCode.toUpperCase() });
    if (!targetClass) {
      return res.status(404).json({ message: 'Class not found with this code' });
    }

    // Check if student is already enrolled
    const existingEnrollment = await Enrollment.findOne({
      classId: targetClass._id,
      studentId: req.user.userId
    });

    if (existingEnrollment) {
      if (existingEnrollment.status === 'enrolled') {
        return res.status(400).json({ message: 'You are already enrolled in this class' });
      } else {
        // Re-enroll
        existingEnrollment.status = 'enrolled';
        existingEnrollment.enrolledAt = new Date();
        await existingEnrollment.save();
        return res.status(200).json({ message: 'Successfully re-enrolled in class', enrollment: existingEnrollment });
      }
    }

    const newEnrollment = new Enrollment({
      classId: targetClass._id,
      studentId: req.user.userId,
      status: 'enrolled'
    });

    await newEnrollment.save();
    res.status(201).json({
      message: 'Joined class successfully',
      class: targetClass,
      enrollment: newEnrollment
    });
  } catch (error) {
    console.error('Join class error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.listClasses = async (req, res) => {
  try {
    const userId = req.user.userId;
    // List classes taught by user or where student is enrolled
    const teachingClasses = await Class.find({ teacherId: userId });
    
    const enrollments = await Enrollment.find({ studentId: userId, status: 'enrolled' }).populate('classId');
    const enrolledClasses = enrollments.map(e => e.classId).filter(c => c != null);

    res.status(200).json({
      teaching: teachingClasses,
      enrolled: enrolledClasses
    });
  } catch (error) {
    console.error('List classes error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.listMembers = async (req, res) => {
  try {
    const { classId } = req.params;
    const targetClass = await Class.findById(classId);
    if (!targetClass) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const enrollments = await Enrollment.find({ classId, status: 'enrolled' });
    const students = enrollments.map(e => e.studentId);

    res.status(200).json({
      classId,
      teacherId: targetClass.teacherId,
      students
    });
  } catch (error) {
    console.error('List members error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getClassSettings = async (req, res) => {
  try {
    const { classId } = req.params;
    let settings = await ClassSettings.findOne({ classId });
    if (!settings) {
      // Lazy initialization if settings don't exist
      settings = new ClassSettings({ classId });
      await settings.save();
    }
    res.status(200).json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.updateClassSettings = async (req, res) => {
  try {
    const { classId } = req.params;
    const { allowStudentPosts, allowStudentComments, theme } = req.body;

    const targetClass = await Class.findById(classId);
    if (!targetClass) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Only teacher of the class can update settings
    if (targetClass.teacherId !== req.user.userId && !req.user.roles.includes('Admin')) {
      return res.status(403).json({ message: 'Only the class teacher or admin can modify settings' });
    }

    let settings = await ClassSettings.findOne({ classId });
    if (!settings) {
      settings = new ClassSettings({ classId });
    }

    if (allowStudentPosts !== undefined) settings.allowStudentPosts = allowStudentPosts;
    if (allowStudentComments !== undefined) settings.allowStudentComments = allowStudentComments;
    if (theme !== undefined) settings.theme = theme;
    settings.updatedAt = new Date();

    await settings.save();
    res.status(200).json({ message: 'Class settings updated successfully', settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.logAttendance = async (req, res) => {
  try {
    const { classId } = req.params;
    const { studentId, date, status } = req.body;

    if (!studentId || !date || !status) {
      return res.status(400).json({ message: 'studentId, date, and status are required' });
    }

    const targetClass = await Class.findById(classId);
    if (!targetClass) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (targetClass.teacherId !== req.user.userId && !req.user.roles.includes('Admin')) {
      return res.status(403).json({ message: 'Only the class teacher or admin can log attendance' });
    }

    const logDate = new Date(date);
    const startOfDay = new Date(logDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(logDate);
    endOfDay.setHours(23, 59, 59, 999);

    let attendanceLog = await AttendanceLog.findOne({
      classId,
      studentId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (attendanceLog) {
      attendanceLog.status = status;
      attendanceLog.recordedBy = req.user.userId;
      await attendanceLog.save();
    } else {
      attendanceLog = new AttendanceLog({
        classId,
        studentId,
        date: new Date(date),
        status,
        recordedBy: req.user.userId
      });
      await attendanceLog.save();
    }

    // Broadcast Socket.IO event
    broadcastToClass(classId, 'attendance:logged', attendanceLog);

    res.status(200).json({
      message: 'Attendance logged successfully',
      attendanceLog
    });
  } catch (error) {
    console.error('Log attendance error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
