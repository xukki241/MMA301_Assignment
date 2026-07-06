const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// All class routes require authentication
router.use(verifyToken);

/**
 * @openapi
 * /api/classes:
 *   post:
 *     summary: Create a new class
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Class created successfully
 *       400:
 *         description: Class name is required
 *   get:
 *     summary: List classes for the authenticated user
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of classes taught or enrolled
 */
router.post('/', authorizeRoles('Teacher', 'Admin'), classController.createClass);

/**
 * @openapi
 * /api/classes/join:
 *   post:
 *     summary: Join a class by code
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - classCode
 *             properties:
 *               classCode:
 *                 type: string
 *     responses:
 *       201:
 *         description: Joined class successfully
 *       400:
 *         description: Class code is required
 *       404:
 *         description: Class not found
 */
router.post('/join', classController.joinClass);
router.get('/', classController.listClasses);

/**
 * @openapi
 * /api/classes/{classId}/members:
 *   get:
 *     summary: List members in a class
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of members
 *       404:
 *         description: Class not found
 */
router.get('/:classId/members', classController.listMembers);

/**
 * @openapi
 * /api/classes/{classId}/settings:
 *   get:
 *     summary: Get settings for a class
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Class settings
 *   put:
 *     summary: Update settings for a class
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               allowStudentPosts:
 *                 type: boolean
 *               allowStudentComments:
 *                 type: boolean
 *               theme:
 *                 type: string
 *     responses:
 *       200:
 *         description: Settings updated
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Class not found
 */
router.get('/:classId/settings', classController.getClassSettings);
router.put('/:classId/settings', classController.updateClassSettings);

/**
 * @openapi
 * /api/classes/{classId}/attendance:
 *   post:
 *     summary: Log attendance for a student
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - date
 *               - status
 *             properties:
 *               studentId:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [present, absent, late, excused]
 *     responses:
 *       200:
 *         description: Attendance logged successfully
 *       400:
 *         description: Missing fields
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Class not found
 */
router.post('/:classId/attendance', classController.logAttendance);

module.exports = router;
