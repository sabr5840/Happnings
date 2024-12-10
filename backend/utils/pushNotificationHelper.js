const { admin } = require('../config/firebaseAdmin'); // Importér Firebase Admin SDK

/**
 * Sends a push notification using Firebase Cloud Messaging (FCM).
 * 
 * @param {string} fcmToken - FCM token for the user/device.
 * @param {string} title - Notification title.
 * @param {string} body - Notification body message.
 */
const sendPushNotification = async (fcmToken, title, body) => {
  const payload = {
    notification: {
      title: title,
      body: body,
    },
    token: fcmToken,
  };

  try {
    const response = await admin.messaging().send(payload);
    console.log('Push notification sent successfully:', response);
    return response; // Returner response for yderligere behandling eller bekræftelse
  } catch (error) {
    console.error('Error sending push notification:', error.message);
    throw error;  // Kast en fejl for at håndtere den i kaldende funktioner hvis nødvendigt
  }
};


module.exports = { sendPushNotification };
