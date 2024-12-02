const db = require('../config/db');
const cron = require('node-cron');
const moment = require('moment');
const admin = require('../config/firebaseAdmin');
const axios = require('axios');

const REMINDER_TYPES = {
  1: { label: '1 hour before', duration: { hours: 1 } },
  2: { label: '1 day before', duration: { days: 1 } },
  3: { label: '2 days before', duration: { days: 2 } },
  4: { label: '1 week before', duration: { days: 7 } }
};

// Get all notifications for a user
exports.getNotifications = async (req, res) => {
  const userId = req.session.userId;

  try {
    // Fetch notifications from the database
    const [notifications] = await db.query(
      `SELECT n.* FROM Notification n WHERE n.User_ID = ?`,
      [userId]
    );

    // For each notification, fetch event details from Ticketmaster API
    const notificationsWithEventDetails = await Promise.all(notifications.map(async (notification) => {
      const event = await getEventFromTicketmaster(notification.eventId);
      return {
        ...notification,
        event: event || null,  // Include event details or null if not found
      };
    }));

    res.json(notificationsWithEventDetails);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
  const userId = req.session.userId;
  const { id } = req.params;

  // Ensure Notification_ID is an integer
  const notificationId = parseInt(id, 10);
  if (isNaN(notificationId)) {
    return res.status(400).json({ message: 'Invalid Notification ID' });
  }

  try {
    const [result] = await db.query(
      'DELETE FROM Notification WHERE Notification_ID = ? AND User_ID = ?',
      [notificationId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a notification
exports.updateNotification = async (req, res) => {
  const { id } = req.params; // Notification ID from URL
  const { newEventId, newReminderId } = req.body; // New Event and Reminder IDs from request body
  const userId = req.session.userId; // User ID from session

  // Ensure Notification_ID is an integer
  const notificationId = parseInt(id, 10);
  if (isNaN(notificationId)) {
    return res.status(400).json({ message: 'Invalid Notification ID' });
  }

  try {
    const [result] = await db.query(
      'UPDATE Notification SET eventId = ?, Reminder_ID = ? WHERE Notification_ID = ? AND User_ID = ?',
      [newEventId, newReminderId, notificationId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Notification not found or no changes made' });
    }

    res.json({ message: 'Notification updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Schedule a notification
function scheduleNotification(token, message, scheduleTime, notificationId) {
  const delay = new Date(scheduleTime) - new Date();

  // Log current time and scheduled time to debug
  console.log('Current Time:', new Date());
  console.log('Schedule Time:', new Date(scheduleTime));

  if (delay < 0) {
    console.log('Cannot schedule a notification in the past.');
    return;
  }

  console.log(`Notification scheduled to be sent in ${Math.round(delay / 1000)} seconds.`);
  console.log(`Scheduled Time: ${scheduleTime}`);

  setTimeout(async () => {
    sendPushNotification(token, message);

    // Delete the notification from the database after sending
    try {
      await db.query('DELETE FROM Notification WHERE Notification_ID = ?', [notificationId]);
      console.log(`Notification with ID ${notificationId} deleted from the database.`);
    } catch (error) {
      console.error('Failed to delete notification from the database:', error.message);
    }
  }, delay);
}

// Function that sends actual push notifications to user's devices via Firebase Cloud Messaging (FCM)
function sendPushNotification(token, message) {
  const payload = {
    notification: {
      title: 'Event Reminder',
      body: message,
    },
    token: token
  };

  admin.messaging().send(payload)
    .then((response) => {
      console.log('Successfully sent message:', response);
    })
    .catch((error) => {
      console.log('Error sending message:', error);
    });
}

// Helper function to calculate the reminder time
function calculateScheduleTime(eventStartTime, reminderTime) {
  const eventTime = moment(eventStartTime);  // Use local time
  return eventTime.subtract(moment.duration(reminderTime)).toDate();
}

// Create a notification and schedule a push notification
exports.addNotification = async (req, res) => {
  const { eventId, reminderId, reminderIds } = req.body; // Accept both single `reminderId` or multiple `reminderIds`
  const userId = req.session.userId; // Assume user is logged in

  try {
    // Validate `eventId`
    if (!eventId) {
      return res.status(400).json({ message: 'Invalid input data: eventId is required' });
    }

    // Determine if `reminderIds` is an array or if a single `reminderId` is provided
    const reminders = Array.isArray(reminderIds) ? reminderIds : [reminderId];

    // Ensure at least one valid reminderId
    if (!reminders.every(id => REMINDER_TYPES[id])) {
      return res.status(400).json({ message: 'Invalid input data: invalid reminderId(s)' });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    // Fetch event start time from Ticketmaster API
    const event = await getEventFromTicketmaster(eventId);  // Fetch event details from Ticketmaster API
    if (!event) {
      throw new Error('Event not found');
    }

    // Use the correct event start time: dateTime (ISO 8601 format)
    const eventStartTime = event.dateTime;  // ISO 8601 dateTime from the event object

    // Check if event has already passed
    if (moment(eventStartTime).isBefore(moment())) {
      console.log('Event has already passed.');
      return res.status(400).json({ message: 'Event has already passed' });
    }

    // Fetch user's FCM token
    const [user] = await connection.query('SELECT FCM_Token FROM user WHERE User_ID = ?', [userId]);
    if (user.length === 0 || !user[0].FCM_Token) {
      throw new Error('User FCM Token not found');
    }

    const userToken = user[0].FCM_Token;

    // Loop over each reminder and schedule notification
    for (const reminder of reminders) {
      const reminderDuration = REMINDER_TYPES[reminder].duration;
      const scheduleTime = calculateScheduleTime(eventStartTime, reminderDuration);

      // Insert the notification into the database
      const [result] = await connection.query(
        'INSERT INTO Notification (User_ID, eventId, Reminder_ID, Time_reminder) VALUES (?, ?, ?, ?)',
        [userId, eventId, reminder, scheduleTime]
      );
      const notificationId = result.insertId;

      // Schedule the notification
      const message = `Reminder: ${event.name} is happening soon!`;
      scheduleNotification(userToken, message, scheduleTime, notificationId);
    }

    // Commit transaction
    await connection.commit();
    res.json({ message: 'Notification(s) scheduled successfully' });

  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: error.message || 'Error creating notification' });
  }
};

// Helper function to fetch event details from Ticketmaster API
async function getEventFromTicketmaster(eventId) {
  try {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    const apiUrl = `https://app.ticketmaster.com/discovery/v2/events/${eventId}.json`;

    const response = await axios.get(apiUrl, { params: { apikey: apiKey } });

    const eventData = response.data;

    const event = {
      id: eventData.id,
      name: eventData.name,
      dateTime: eventData.dates.start.dateTime,  // Use ISO 8601 dateTime
      // Include other event details if needed
    };

    return event;
  } catch (error) {
    console.error('Error fetching event from Ticketmaster:', error.response ? error.response.data : error.message);
    return null;
  }
}
