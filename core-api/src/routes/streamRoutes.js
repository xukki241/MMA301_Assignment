const express = require('express');
const router = express.Router();
const streamController = require('../controllers/streamController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.post('/classes/:classId/posts', streamController.createPost);
router.get('/classes/:classId/posts', streamController.listPosts);
router.post('/posts/:postId/comments', streamController.createComment);
router.get('/posts/:postId/comments', streamController.listComments);

module.exports = router;
