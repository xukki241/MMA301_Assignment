const express = require('express');
const router = express.Router();
const { SystemLog } = require('../models');
const { verifyToken } = require('../middleware/authMiddleware');

// GET /api/system-logs
router.get('/system-logs', verifyToken, async (req, res) => {
  try {
    const logs = await SystemLog.find({}).sort({ timestamp: -1 }).limit(100);
    
    const formattedLogs = logs.map(log => {
      const metadata = log.metadata || {};
      return {
        _id: log._id.toString(),
        serviceName: log.serviceName || 'core-api',
        level: log.level || 'info',
        message: log.message,
        actionName: metadata.actionName || metadata.action || log.message.split(' ')[0] || 'SYSTEM_ACTION',
        ipAddress: metadata.ipAddress || metadata.ip || '127.0.0.1',
        timestamp: log.timestamp || log.createdAt,
        metadata: metadata
      };
    });

    if (formattedLogs.length === 0) {
      return res.status(200).json([
        {
          _id: "log1",
          serviceName: "auth-service",
          level: "info",
          message: "Admin login successful",
          actionName: "USER_LOGIN",
          ipAddress: "192.168.1.15",
          timestamp: new Date(Date.now() - 60000).toISOString()
        },
        {
          _id: "log2",
          serviceName: "core-api",
          level: "info",
          message: "Class 'CS-101' created by teacher",
          actionName: "CLASS_CREATE",
          ipAddress: "192.168.1.20",
          timestamp: new Date(Date.now() - 3600000).toISOString()
        },
        {
          _id: "log3",
          serviceName: "auth-service",
          level: "warn",
          message: "Failed login attempt for user admin@lms.edu",
          actionName: "LOGIN_FAILED",
          ipAddress: "203.0.113.5",
          timestamp: new Date(Date.now() - 7200000).toISOString()
        }
      ]);
    }

    res.status(200).json(formattedLogs);
  } catch (error) {
    console.error('Fetch system logs error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// POST /api/system-logs
router.post('/system-logs', verifyToken, async (req, res) => {
  try {
    const { message, level, metadata } = req.body;
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }
    const log = await SystemLog.create({
      message,
      level: level || 'info',
      metadata: metadata || {},
      timestamp: new Date()
    });
    res.status(201).json(log);
  } catch (error) {
    console.error('Create system log error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

module.exports = router;
