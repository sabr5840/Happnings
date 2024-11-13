const db = require('../config/db');

// Opret en notifikation
exports.addNotification = async (req, res) => {
  const { eventId, reminderTime } = req.body;
  const userId = req.session.userId;

  try {
    await db.query(
      'INSERT INTO Notification (User_ID, Event_ID, Time_reminder, Is_Read) VALUES (?, ?, ?, false)',
      [userId, eventId, reminderTime]
    );
    res.status(201).json({ message: 'Notification created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Hent alle notifikationer for en bruger
exports.getNotifications = async (req, res) => {
    const userId = req.session.userId;
  
    try {
      const [notifications] = await db.query(
        'SELECT * FROM Notification WHERE User_ID = ?',
        [userId]
      );
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
};

// Slet en notifikation
exports.deleteNotification = async (req, res) => {
    const userId = req.session.userId;
    const { id } = req.params;
  
    try {
      const [result] = await db.query('DELETE FROM Notification WHERE Notification_ID = ? AND User_ID = ?', [id, userId]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Notification not found' });
      }
  
      res.json({ message: 'Notification deleted' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
};
  
  