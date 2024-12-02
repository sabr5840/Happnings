// test/NotificationController.test.js

const NotificationController = require('../controllers/NotificationController');
const db = require('../config/db');
const axios = require('axios');
const admin = require('../config/firebaseAdmin');
const moment = require('moment');

// Mock dependencies
jest.mock('../config/db');
jest.mock('axios');
jest.mock('../config/firebaseAdmin');

describe('NotificationController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      session: { userId: 1 },
      params: {},
      body: {}
    };
    res = {
      json: jest.fn(),
      status: jest.fn(() => res)
    };
    jest.clearAllMocks();
  });

  // Test for getNotifications
  describe('getNotifications', () => {
    it('should return notifications with complete event details', async () => {
      // Mock database response
      db.query.mockResolvedValueOnce([[{
        Notification_ID: 1,
        User_ID: 1,
        eventId: 'event123',
        Reminder_ID: 1,
        Time_reminder: new Date()
      }]]);

      // Mock Ticketmaster API response with additional fields
      axios.get.mockResolvedValueOnce({
        data: {
          id: 'event123',
          name: 'Sample Event',
          dates: {
            start: {
              dateTime: '2023-12-01T20:00:00Z',
              localDate: '2023-12-01',
              localTime: '20:00:00'
            }
          }
        }
      });

      await NotificationController.getNotifications(req, res);

      expect(db.query).toHaveBeenCalledWith(
        `SELECT n.* FROM Notification n WHERE n.User_ID = ?`,
        [1]
      );
      expect(axios.get).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([{
        Notification_ID: 1,
        User_ID: 1,
        eventId: 'event123',
        Reminder_ID: 1,
        Time_reminder: expect.any(Date),
        event: {
          id: 'event123',
          title: 'Sample Event', // Updated from 'name' to 'title'
          dateTime: '2023-12-01T20:00:00Z',
          date: '2023-12-01',
          time: '20:00:00'
        }
      }]);
    });

    it('should handle errors and return 500', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      await NotificationController.getNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  // Test for deleteNotification
  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      req.params.id = '1';
      db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      await NotificationController.deleteNotification(req, res);

      expect(db.query).toHaveBeenCalledWith(
        'DELETE FROM Notification WHERE Notification_ID = ? AND User_ID = ?',
        [1, 1]
      );
      expect(res.json).toHaveBeenCalledWith({ message: 'Notification deleted' });
    });

    it('should return 404 if notification not found', async () => {
      req.params.id = '1';
      db.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

      await NotificationController.deleteNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Notification not found' });
    });

    it('should return 400 for invalid ID', async () => {
      req.params.id = 'invalid';

      await NotificationController.deleteNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid Notification ID' });
    });

    it('should handle errors and return 500', async () => {
      req.params.id = '1';
      db.query.mockRejectedValueOnce(new Error('Database error'));

      await NotificationController.deleteNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  // Test for updateNotification
  describe('updateNotification', () => {
    it('should update a notification', async () => {
      req.params.id = '1';
      req.body.newEventId = 'event456';
      req.body.newReminderId = 2;
      db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      await NotificationController.updateNotification(req, res);

      expect(db.query).toHaveBeenCalledWith(
        'UPDATE Notification SET eventId = ?, Reminder_ID = ? WHERE Notification_ID = ? AND User_ID = ?',
        ['event456', 2, 1, 1]
      );
      expect(res.json).toHaveBeenCalledWith({ message: 'Notification updated successfully' });
    });

    it('should return 404 if notification not found or no changes made', async () => {
      req.params.id = '1';
      req.body.newEventId = 'event456';
      req.body.newReminderId = 2;
      db.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

      await NotificationController.updateNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Notification not found or no changes made' });
    });

    it('should return 400 for invalid ID', async () => {
      req.params.id = 'invalid';

      await NotificationController.updateNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid Notification ID' });
    });

    it('should handle errors and return 500', async () => {
      req.params.id = '1';
      req.body.newEventId = 'event456';
      req.body.newReminderId = 2;
      db.query.mockRejectedValueOnce(new Error('Database error'));

      await NotificationController.updateNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  // Test for addNotification
  describe('addNotification', () => {
    it('should add a notification and schedule it', async () => {
      req.body.eventId = 'event789';
      req.body.reminderId = 1;

      // Mock Ticketmaster API response
      const eventDateTime = moment().add(2, 'days').toISOString();
      const eventDate = moment().add(2, 'days').format('YYYY-MM-DD');
      const eventTime = '20:00:00';

      axios.get.mockResolvedValueOnce({
        data: {
          id: 'event789',
          name: 'Test Event',
          dates: {
            start: {
              dateTime: eventDateTime,
              localDate: eventDate,
              localTime: eventTime
            }
          }
        }
      });

      // Mock database connection
      const connection = {
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        query: jest.fn(),
        rollback: jest.fn()
      };
      db.getConnection.mockResolvedValueOnce(connection);

      // Mock user FCM token retrieval and notification insertion
      connection.query
        .mockResolvedValueOnce([[{ FCM_Token: 'fake_fcm_token' }]]) // For fetching user token
        .mockResolvedValueOnce([{ insertId: 1 }]); // For inserting notification

      // Mock admin.messaging().send
      const sendMock = jest.fn().mockResolvedValue('message-id');
      admin.messaging = jest.fn().mockReturnValue({
        send: sendMock
      });

      // Mock setTimeout to execute immediately
      jest.useFakeTimers();

      await NotificationController.addNotification(req, res);

      expect(connection.beginTransaction).toHaveBeenCalled();
      expect(connection.commit).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Notification(s) scheduled successfully' });

      // Advance timers to simulate setTimeout
      jest.runAllTimers();

      expect(sendMock).toHaveBeenCalledWith({
        notification: {
          title: `Påmindelse for Test Event`,
          body: expect.stringContaining('Der er ikke mindre end'),
        },
        token: 'fake_fcm_token'
      });
    });

    it('should return 400 if eventId is missing', async () => {
      req.body.reminderId = 1;

      await NotificationController.addNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid input data: eventId is required' });
    });

    it('should return 400 if reminderId is invalid', async () => {
      req.body.eventId = 'event789';
      req.body.reminderId = 99;

      await NotificationController.addNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid input data: invalid reminderId(s)' });
    });

    it('should handle errors and return 500', async () => {
      req.body.eventId = 'event789';
      req.body.reminderId = 1;

      // Mock axios.get to throw an error
      axios.get.mockRejectedValueOnce(new Error('Ticketmaster API error'));

      // Mock database connection
      const connection = {
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        query: jest.fn(),
        rollback: jest.fn()
      };
      db.getConnection.mockResolvedValueOnce(connection);

      await NotificationController.addNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Ticketmaster API error' });
    });
  });
});
