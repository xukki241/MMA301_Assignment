import { Class, ClassPost, PostComment, ClassSettings } from '../models/index';
import { broadcastToClass } from '../socket';

export const createPost = async (req, res) => {
  try {
    const { classId } = req.params;
    const { content, attachmentUrls } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Post content is required' });
    }

    const targetClass = await Class.findById(classId);
    if (!targetClass) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const isTeacher = targetClass.teacherId === req.user.userId || req.user.roles.includes('Admin');

    if (!isTeacher) {
      // Check class settings to see if students are allowed to post
      const settings = await ClassSettings.findOne({ classId });
      if (settings && !settings.allowStudentPosts) {
        return res.status(403).json({ message: 'Posting to the stream is disabled for students in this class' });
      }
    }

    const post = new ClassPost({
      classId,
      authorId: req.user.userId,
      content,
      attachmentUrls: attachmentUrls || []
    });

    await post.save();

    // Broadcast Socket.IO event
    broadcastToClass(classId, 'post:created', post);

    res.status(201).json({ message: 'Post created successfully', post });
  } catch (error) {
    console.error('Create stream post error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const listPosts = async (req, res) => {
  try {
    const { classId } = req.params;
    const posts = await ClassPost.find({ classId }).sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    console.error('List stream posts error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const post = await ClassPost.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const targetClass = await Class.findById(post.classId);
    const isTeacher = targetClass && (targetClass.teacherId === req.user.userId || req.user.roles.includes('Admin'));

    if (!isTeacher) {
      // Check settings to see if students are allowed to comment
      const settings = await ClassSettings.findOne({ classId: post.classId });
      if (settings && !settings.allowStudentComments) {
        return res.status(403).json({ message: 'Commenting is disabled for students in this class' });
      }
    }

    const comment = new PostComment({
      postId,
      authorId: req.user.userId,
      content
    });

    await comment.save();

    // Broadcast Socket.IO event
    if (post.classId) {
      broadcastToClass(post.classId.toString(), 'comment:created', comment);
    }

    res.status(201).json({ message: 'Comment added successfully', comment });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const listComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const comments = await PostComment.find({ postId }).sort({ createdAt: 1 });
    res.status(200).json(comments);
  } catch (error) {
    console.error('List comments error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
