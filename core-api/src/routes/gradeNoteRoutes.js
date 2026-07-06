const express = require('express');
const router = express.Router();
const gradeNoteController = require('../controllers/gradeNoteController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.post('/submissions/:submissionId/grade', gradeNoteController.gradeSubmission);
router.post('/submissions/:submissionId/notes', gradeNoteController.createPrivateNote);
router.get('/submissions/:submissionId/notes', gradeNoteController.getPrivateNotes);

module.exports = router;
