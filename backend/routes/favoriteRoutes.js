// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/NotificationController');
const authMiddleware = require('../middleware/authMiddleware'); // Assuming you have an auth middleware

// Define the route for getting all notifications for a user
router.get('/', authMiddleware, NotificationController.getNotifications);

// Define the route for adding a notification
router.post('/', authMiddleware, NotificationController.addNotification);

// Define the route for deleting a notification
router.delete('/:id', authMiddleware, NotificationController.deleteNotification);

// Define the route for updating a notification
router.put('/:id', authMiddleware, NotificationController.updateNotification);

module.exports = router;
