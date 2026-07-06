import { Exercise, Submission, SubmissionFile, Topic, Class } from '../models/index';

export const createExercise = async (req, res) => {
  try {
    const { topicId } = req.params;
    const { title, description, dueDate, maxPoints } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Exercise title is required' });
    }

    const topic = await Topic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    const targetClass = await Class.findById(topic.classId);
    if (targetClass && targetClass.teacherId !== req.user.userId && !req.user.roles.includes('Admin')) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const exercise = new Exercise({
      topicId,
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : null,
      maxPoints: maxPoints || 100,
      createdBy: req.user.userId
    });

    await exercise.save();
    res.status(201).json({ message: 'Exercise created successfully', exercise });
  } catch (error) {
    console.error('Create exercise error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const listExercises = async (req, res) => {
  try {
    const { topicId } = req.params;
    const exercises = await Exercise.find({ topicId }).sort({ createdAt: -1 });
    res.status(200).json(exercises);
  } catch (error) {
    console.error('List exercises error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const submitExercise = async (req, res) => {
  try {
    const { exerciseId } = req.params;
    const { files } = req.body; // Expecting array of { fileName, fileSize }

    const exercise = await Exercise.findById(exerciseId);
    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }

    // Check if a submission already exists for this student/exercise
    let submission = await Submission.findOne({ exerciseId, studentId: req.user.userId });
    if (submission) {
      // Allow re-submission: update status and timestamp
      submission.submittedAt = new Date();
      submission.status = 'submitted';
      await submission.save();
    } else {
      submission = new Submission({
        exerciseId,
        studentId: req.user.userId,
        submittedAt: new Date(),
        status: 'submitted'
      });
      await submission.save();
    }

    const submissionFiles = [];
    const presignedUrls = [];

    if (files && Array.isArray(files)) {
      for (const file of files) {
        const { fileName, fileSize } = file;
        const fileUrl = `https://lms-student-submissions.s3.amazonaws.com/${submission._id}/${encodeURIComponent(fileName)}`;
        
        // Register SubmissionFile metadata in MongoDB
        const subFile = new SubmissionFile({
          submissionId: submission._id,
          fileUrl,
          fileName,
          fileSize,
          uploadedAt: new Date()
        });
        await subFile.save();
        submissionFiles.push(subFile);

        // Generate Mock S3 Pre-signed URL Response
        const mockPresignedUrl = `https://lms-student-submissions.s3.amazonaws.com/${submission._id}/${encodeURIComponent(fileName)}?AWSAccessKeyId=mockAccessKeyId&Signature=mockSignatureSignature&Expires=${Math.floor(Date.now() / 1000) + 3600}`;
        presignedUrls.push({
          fileName,
          fileUrl,
          presignedUploadUrl: mockPresignedUrl
        });
      }
    }

    res.status(201).json({
      message: 'Work submitted successfully',
      submission,
      files: submissionFiles,
      mockS3PresignedUploads: presignedUrls
    });
  } catch (error) {
    console.error('Submit exercise error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const getSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // A student can see their own submission; teacher can see all
    if (submission.studentId !== req.user.userId && !req.user.roles.includes('Teacher') && !req.user.roles.includes('Admin')) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const files = await SubmissionFile.find({ submissionId });

    res.status(200).json({
      submission,
      files
    });
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
