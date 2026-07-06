import express from 'express';
const router = express.Router();
import * as gradeNoteController from '../controllers/gradeNoteController';
import { verifyToken } from '../middleware/authMiddleware';

router.use(verifyToken);

router.post('/submissions/:submissionId/grade', gradeNoteController.gradeSubmission);
router.post('/submissions/:submissionId/notes', gradeNoteController.createPrivateNote);
router.get('/submissions/:submissionId/notes', gradeNoteController.getPrivateNotes);

export default router;
