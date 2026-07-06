const express = require('express');
const router = express.Router();
const topicMaterialController = require('../controllers/topicMaterialController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.post('/classes/:classId/topics', topicMaterialController.createTopic);
router.get('/classes/:classId/topics', topicMaterialController.listTopics);
router.put('/topics/:topicId', topicMaterialController.updateTopic);
router.delete('/topics/:topicId', topicMaterialController.deleteTopic);

router.post('/topics/:topicId/materials', topicMaterialController.createMaterial);
router.get('/topics/:topicId/materials', topicMaterialController.listMaterials);

module.exports = router;
