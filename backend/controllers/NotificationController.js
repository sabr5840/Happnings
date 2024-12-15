// controllers/NotificationController.js
const { db } = require('../config/firebaseAdmin');
const moment = require('moment');
const admin = require('../config/firebaseAdmin');
const axios = require('axios');
const { sendPushNotification } = require('../utils/pushNotificationHelper'); // Import pushNotificationHelper


const REMINDER_TYPES = {
  1: { label: '1 time før', duration: { hours: 1 } },
  2: { label: '1 dag før', duration: { days: 1 } },
  3: { label: '2 dage før', duration: { days: 2 } },
  4: { label: '1 uge før', duration: { days: 7 } }
};

// Get all notifications for a user
exports.getNotifications = async (req, res) => {
  const userId = req.user.uid; // Antag at brugeren er autentificeret

  try {
    const notificationsRef = db.collection('notifications').where('userId', '==', userId);
    const snapshot = await notificationsRef.get();
    const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Optionally enrich notifications with event details from an external API
    const enrichedNotifications = await Promise.all(notifications.map(async notification => {
      const eventDetails = await fetchEventDetails(notification.eventId); // This function must be implemented
      return { ...notification, eventDetails };
    }));

    res.json(enrichedNotifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.uid;

  try {
    const docRef = db.collection('notifications').doc(id);
    const doc = await docRef.get();

    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ message: 'Notification not found or user mismatch' });
    }

    await docRef.delete();
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update a notification
exports.updateNotification = async (req, res) => {
  const { id } = req.params;
  const { newEventId, newReminderId } = req.body;
  const userId = req.user.uid;

  try {
    const docRef = db.collection('notifications').doc(id);
    const doc = await docRef.get();

    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ message: 'Notification not found or user mismatch' });
    }

    await docRef.update({
      eventId: newEventId,
      reminderId: newReminderId,
      updatedTime: new Date() // Capture the time of update
    });

    res.json({ message: 'Notification updated successfully' });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ error: error.message });
  }
};

// Add a notification
exports.addNotification = async (req, res) => {
  const { eventId, reminderIds } = req.body; // Accept multiple reminderIds
  const userId = req.user.uid; // Assume the user is authenticated

  try {
    // Validate eventId and reminderIds
    if (!eventId || !Array.isArray(reminderIds) || reminderIds.length === 0) {
      return res.status(400).json({ message: 'Invalid input data: eventId or reminderIds are missing or invalid!' });
    }

    // Check if all reminderIds are valid
    if (reminderIds.some(reminderId => !REMINDER_TYPES[reminderId])) {
      return res.status(400).json({ message: 'Invalid reminderIds provided' });
    }

    // Fetch event details from Ticketmaster API
    const eventDetails = await fetchEventDetails(eventId);
    if (!eventDetails) {
      return res.status(404).json({ message: 'Event not found' });
    }
    const eventName = eventDetails.name || 'Unknown Event';

    // Fetch the user's FCM token from Firestore
    const userRef = db.collection('users').doc(userId);
    const user = await userRef.get();

    if (!user.exists || !user.data().FCM_Token) {
      return res.status(400).json({ message: 'User not found or missing FCM token' });
    }

    const fcmToken = user.data().FCM_Token;

    const notifications = []; // Store all created notifications
    for (const reminderId of reminderIds) {
      const reminderSettings = REMINDER_TYPES[reminderId];

      // Create a new notification in Firestore
      const newDocRef = db.collection('notifications').doc();
      const reminderTime = moment().add(reminderSettings.duration).toDate();
      await newDocRef.set({
        userId,
        eventId,
        eventName,
        reminderId,
        reminderTime,
        createdAt: new Date(),
      });

      notifications.push({ id: newDocRef.id, reminderId, reminderTime });

      // Send a push notification confirming the reminder setup
      await sendPushNotification(
        fcmToken,
        `Reminder Set for Event: ${eventName}`,
        `Your reminder for '${eventName}' is set for ${reminderSettings.label}`
      );

      // Schedule a push notification for the actual reminder
      const delay = moment(reminderTime).diff(moment());
      if (delay > 0) {
        setTimeout(async () => {
          await sendPushNotification(
            fcmToken,
            `Don't Forget: ${eventName}`,
            `Only ${reminderSettings.label} left until '${eventName}' begins!`
          );
        }, delay);
      }
    }

    // Return success response with the created notifications
    res.status(201).json({
      message: 'Notifications added and push notifications scheduled successfully',
      notifications,
    });
  } catch (error) {
    console.error('Error adding notifications:', error);
    res.status(500).json({ error: error.message });
  }
};


// Helper function to fetch event details from Ticketmaster API
async function fetchEventDetails(eventId) {
  try {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    const response = await axios.get(`https://app.ticketmaster.com/discovery/v2/events/${eventId}.json`, {
      params: { apikey: apiKey }
    });
    return response.data; // Assume response data structure contains the necessary event details
  } catch (error) {
    console.error('Error fetching event details:', error);
    throw new Error('Failed to fetch event details');
  }
}
