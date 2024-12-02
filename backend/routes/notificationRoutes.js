// backend/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/NotificationController');

// Define the route for adding a notification
router.post('/notifications/add', NotificationController.addNotification);

// Other existing routes...
router.get('/notifications', NotificationController.getNotifications);
router.delete('/notifications/:id', NotificationController.deleteNotification);
router.put('/notifications/:id', NotificationController.updateNotification);

module.exports = router;
