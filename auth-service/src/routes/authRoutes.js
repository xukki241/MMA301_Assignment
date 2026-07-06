const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.get('/profile', authMiddleware, authController.profile);

router.get('/users', authMiddleware, authController.listUsers);
router.put('/users/:id/role', authMiddleware, authController.updateRole);
router.put('/users/:id/deactivate', authMiddleware, authController.deactivateUser);

module.exports = router;
