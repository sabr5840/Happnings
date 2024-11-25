const db = require('../config/db');
const cron = require('node-cron');
const moment = require('moment'); 
const admin = require('../config/firebaseAdmin');

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
    const [notifications] = await db.query(
      `SELECT n.*, er.Reminder_Time, e.Title, e.Description
       FROM Notification n
       JOIN Event_Reminders er ON n.Reminder_ID = er.Reminder_ID
       JOIN Event e ON er.Event_ID = e.Event_ID
       WHERE n.User_ID = ?`,
      [userId]
    );
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
  const userId = req.session.userId;
  const { id } = req.params;

  try {
    const [result] = await db.query(
      'DELETE FROM Notification WHERE Notification_ID = ? AND User_ID = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
  
// Update a notifications
exports.updateNotification = async (req, res) => {
  const { id } = req.params; // Notification ID from URL
  const { newEventId, newReminderId } = req.body; // New Event and Reminder IDs from request body
  const userId = req.session.userId; // User ID from session

  try {
    const [result] = await db.query(
      'UPDATE Notification SET Event_ID = ?, Reminder_ID = ? WHERE Notification_ID = ? AND User_ID = ?',
      [newEventId, newReminderId, id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Notification not found or no changes made' });
    }

    res.json({ message: 'Notification updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Plan a notifications
function scheduleNotification(token, message, scheduleTime, notificationId) {
  const delay = new Date(scheduleTime) - new Date();

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

/*
//Simulated function
function sendPushNotification(token, message) {
  const payload = {
    notification: {
      title: 'Event Reminder',
      body: message,
    },
    token: token,
  };

  // Simulate by logging the payload
  console.log('Simulating push notification...');
  console.log('Payload:', payload);

  // Simulate success response from Firebase
  console.log('Simulated response: Notification successfully sent!');
}
*/

//function that sends actual push notifications to users' devices via Firebase Cloud Messaging (FCM)
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
  const eventTime = moment(eventStartTime);
  return eventTime.subtract(moment.duration(reminderTime)).toDate();
}

//Input Validation
const validateInput = (input) => {
  return input && !isNaN(Number(input));
};

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

    // Fetch event start time
    const [event] = await connection.query('SELECT StartDateTime FROM Event WHERE Event_ID = ?', [eventId]);
    if (event.length === 0) {
      throw new Error('Event not found');
    }
    const eventStartTime = event[0].StartDateTime;

    // Fetch user's FCM token
    const userToken = await fetchUserToken(userId, connection);

    // Loop through reminders and create notifications
    for (const reminderId of reminders) {
      const scheduleTime = moment(eventStartTime)
        .subtract(REMINDER_TYPES[reminderId].duration)
        .toDate();

      // Insert notification into the database
      const [result] = await connection.query(
        'INSERT INTO Notification (User_ID, Event_ID, Reminder_ID, Time_Reminder, Is_Read) VALUES (?, ?, ?, ?, false, false)',
        [userId, eventId, reminderId, scheduleTime]
      );

      const notificationId = result.insertId; // Get the newly inserted notification ID

      // Schedule the push notification
      const message = `Reminder: Your event starts at ${moment(eventStartTime).format('YYYY-MM-DD HH:mm')}`;
      scheduleNotification(userToken, message, scheduleTime, notificationId);
    }

    await connection.commit();
    res.status(201).json({ message: 'Notifications created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

  
async function fetchUserToken(userId, connection) {
  const [user] = await connection.query('SELECT FCM_Token FROM User WHERE User_ID = ?', [userId]);
  if (user.length === 0 || !user[0].FCM_Token) {
    throw new Error('User token not found');
  }
  return user[0].FCM_Token;
}

async function fetchEventStartTime(eventId, connection) {
  const [event] = await connection.query('SELECT StartDateTime FROM Event WHERE Event_ID = ?', [eventId]);
  if (event.length === 0) {
    throw new Error('Event not found');
  }
  return event[0].StartDateTime;
}

async function fetchReminderTime(reminderId, connection) {
  const [reminder] = await connection.query('SELECT Reminder_Time FROM Event_Reminders WHERE Reminder_ID = ?', [reminderId]);
  if (reminder.length === 0) {
    throw new Error('Reminder not found');
  }
  return reminder[0].Reminder_Time;
}


async function handleNotificationScheduling(userId, eventId, reminderId, connection) {
  const eventStartTime = await fetchEventStartTime(eventId, connection);
  const reminderTime = await fetchReminderTime(reminderId, connection);
  const scheduleTime = calculateScheduleTime(eventStartTime, reminderTime);
  const userToken = await fetchUserToken(userId, connection);
  const message = `Reminder for your event at ${scheduleTime}`;
  scheduleNotification(userToken, message, scheduleTime);
  return scheduleTime;
}

