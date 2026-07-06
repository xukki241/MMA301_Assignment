const { Topic, Material, Class } = require('../models');

// --- Topic Operations ---

exports.createTopic = async (req, res) => {
  try {
    const { classId } = req.params;
    const { title, description, order } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Topic title is required' });
    }

    const targetClass = await Class.findById(classId);
    if (!targetClass) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Verify user is teacher or admin
    if (targetClass.teacherId !== req.user.userId && !req.user.roles.includes('Admin')) {
      return res.status(403).json({ message: 'Only the teacher or admin can add topics' });
    }

    const topic = new Topic({
      classId,
      title,
      description,
      order: order || 0
    });

    await topic.save();
    res.status(201).json({ message: 'Topic created successfully', topic });
  } catch (error) {
    console.error('Create topic error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.listTopics = async (req, res) => {
  try {
    const { classId } = req.params;
    const topics = await Topic.find({ classId }).sort({ order: 1 });
    res.status(200).json(topics);
  } catch (error) {
    console.error('List topics error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.updateTopic = async (req, res) => {
  try {
    const { topicId } = req.params;
    const { title, description, order } = req.body;

    const topic = await Topic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    const targetClass = await Class.findById(topic.classId);
    if (targetClass && targetClass.teacherId !== req.user.userId && !req.user.roles.includes('Admin')) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (title !== undefined) topic.title = title;
    if (description !== undefined) topic.description = description;
    if (order !== undefined) topic.order = order;

    await topic.save();
    res.status(200).json({ message: 'Topic updated successfully', topic });
  } catch (error) {
    console.error('Update topic error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.deleteTopic = async (req, res) => {
  try {
    const { topicId } = req.params;
    const topic = await Topic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    const targetClass = await Class.findById(topic.classId);
    if (targetClass && targetClass.teacherId !== req.user.userId && !req.user.roles.includes('Admin')) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Delete topic and its materials
    await Material.deleteMany({ topicId });
    await Topic.findByIdAndDelete(topicId);

    res.status(200).json({ message: 'Topic and its materials deleted successfully' });
  } catch (error) {
    console.error('Delete topic error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// --- Material Operations ---

exports.createMaterial = async (req, res) => {
  try {
    const { topicId } = req.params;
    const { title, description, fileUrl, fileType } = req.body;

    if (!title || !fileUrl) {
      return res.status(400).json({ message: 'Title and file URL are required' });
    }

    const topic = await Topic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    const targetClass = await Class.findById(topic.classId);
    if (targetClass && targetClass.teacherId !== req.user.userId && !req.user.roles.includes('Admin')) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const material = new Material({
      topicId,
      title,
      description,
      fileUrl,
      fileType,
      uploadedBy: req.user.userId
    });

    await material.save();
    res.status(201).json({ message: 'Material created successfully', material });
  } catch (error) {
    console.error('Create material error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.listMaterials = async (req, res) => {
  try {
    const { topicId } = req.params;
    const materials = await Material.find({ topicId }).sort({ createdAt: -1 });
    res.status(200).json(materials);
  } catch (error) {
    console.error('List materials error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
