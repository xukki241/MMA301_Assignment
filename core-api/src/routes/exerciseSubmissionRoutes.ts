import express from 'express';
const router = express.Router();
import * as exerciseSubmissionController from '../controllers/exerciseSubmissionController';
import { verifyToken } from '../middleware/authMiddleware';

router.use(verifyToken);

router.post('/topics/:topicId/exercises', exerciseSubmissionController.createExercise);
router.get('/topics/:topicId/exercises', exerciseSubmissionController.listExercises);
router.post('/exercises/:exerciseId/submissions', exerciseSubmissionController.submitExercise);
router.get('/submissions/:submissionId', exerciseSubmissionController.getSubmission);

export default router;
