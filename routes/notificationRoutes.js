const express = require('express');
const { addNotification, getNotifications, deleteNotification } = require('../controllers/NotificationController');
const authMiddleware = require('../middleware/authMiddleware'); 
const router = express.Router();

// Create a notifikation
router.post('/', authMiddleware, addNotification);

// Get all notifikationer for a user
router.get('/', authMiddleware, getNotifications);

// Delete a notifikation
router.delete('/:id', authMiddleware, deleteNotification);

module.exports = router;
