import { Submission, Grade, PrivateNote, Exercise, Topic, Class } from '../models/index';
import { broadcastToClass } from '../socket';

export const gradeSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { points, feedback } = req.body;

    if (points === undefined) {
      return res.status(400).json({ message: 'Points value is required' });
    }

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const exercise = await Exercise.findById(submission.exerciseId);
    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }

    const topic = await Topic.findById(exercise.topicId);
    const targetClass = topic ? await Class.findById(topic.classId) : null;

    if (targetClass && targetClass.teacherId !== req.user.userId && !req.user.roles.includes('Admin')) {
      return res.status(403).json({ message: 'Only the class teacher or admin can grade submissions' });
    }

    // Save/update the Grade record
    let grade = await Grade.findOne({ submissionId });
    if (grade) {
      grade.points = points;
      grade.feedback = feedback;
      grade.gradedBy = req.user.userId;
      grade.gradedAt = new Date();
      await grade.save();
    } else {
      grade = new Grade({
        submissionId,
        points,
        feedback,
        gradedBy: req.user.userId,
        gradedAt: new Date()
      });
      await grade.save();
    }

    // Update the Submission record status and score
    submission.status = 'graded';
    submission.points = points;
    submission.feedback = feedback;
    await submission.save();

    // Broadcast Socket.IO event
    if (topic && topic.classId) {
      broadcastToClass(topic.classId.toString(), 'grade:updated', grade);
    }

    res.status(200).json({
      message: 'Submission graded successfully',
      submission,
      grade
    });
  } catch (error) {
    console.error('Grade submission error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const createPrivateNote = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Note content is required' });
    }

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Determine sender and receiver
    const senderId = req.user.userId;
    let receiverId;

    if (senderId === submission.studentId) {
      // Sender is student, receiver must be the teacher of the class
      const exercise = await Exercise.findById(submission.exerciseId);
      const topic = exercise ? await Topic.findById(exercise.topicId) : null;
      const targetClass = topic ? await Class.findById(topic.classId) : null;
      if (!targetClass) {
        return res.status(404).json({ message: 'Class/teacher not found for this exercise' });
      }
      receiverId = targetClass.teacherId;
    } else {
      // Sender is teacher, receiver must be the student
      receiverId = submission.studentId;

      // Verify sender is indeed teacher or admin
      const exercise = await Exercise.findById(submission.exerciseId);
      const topic = exercise ? await Topic.findById(exercise.topicId) : null;
      const targetClass = topic ? await Class.findById(topic.classId) : null;
      if (targetClass && targetClass.teacherId !== senderId && !req.user.roles.includes('Admin')) {
        return res.status(403).json({ message: 'Unauthorized to send notes to this student' });
      }
    }

    const privateNote = new PrivateNote({
      submissionId,
      senderId,
      receiverId,
      content,
      createdAt: new Date()
    });

    await privateNote.save();
    res.status(201).json({ message: 'Private note sent successfully', privateNote });
  } catch (error) {
    console.error('Create private note error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const getPrivateNotes = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Authorization check
    if (submission.studentId !== req.user.userId && !req.user.roles.includes('Teacher') && !req.user.roles.includes('Admin')) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const notes = await PrivateNote.find({ submissionId }).sort({ createdAt: 1 });
    res.status(200).json(notes);
  } catch (error) {
    console.error('Get private notes error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
