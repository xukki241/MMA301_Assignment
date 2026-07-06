const express = require('express');
const router = express.Router();
const exerciseSubmissionController = require('../controllers/exerciseSubmissionController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.post('/topics/:topicId/exercises', exerciseSubmissionController.createExercise);
router.get('/topics/:topicId/exercises', exerciseSubmissionController.listExercises);
router.post('/exercises/:exerciseId/submissions', exerciseSubmissionController.submitExercise);
router.get('/submissions/:submissionId', exerciseSubmissionController.getSubmission);

module.exports = router;
