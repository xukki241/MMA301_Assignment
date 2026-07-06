import express from 'express';
const router = express.Router();
import * as streamController from '../controllers/streamController';
import { verifyToken } from '../middleware/authMiddleware';

router.use(verifyToken);

router.post('/classes/:classId/posts', streamController.createPost);
router.get('/classes/:classId/posts', streamController.listPosts);
router.post('/posts/:postId/comments', streamController.createComment);
router.get('/posts/:postId/comments', streamController.listComments);

export default router;
