const notificationController = require('../controllers/NotificationController');
const db = require('../config/db');

// Mock db.query and helper functions
jest.mock('../config/db', () => ({
  query: jest.fn(),
  getConnection: jest.fn(() => ({
    query: jest.fn(),
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
  })),
}));

const mockReq = (body = {}, params = {}, session = {}) => ({
  body,
  params,
  session,
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('NotificationController', () => {
  describe('getNotifications', () => {
    it('should return notifications for a user', async () => {
      const req = mockReq({}, {}, { userId: 1 });
      const res = mockRes();
      db.query.mockResolvedValueOnce([
        [
          { Notification_ID: 1, Title: 'Test Event', Reminder_Time: '2023-11-25 10:00:00' },
        ],
      ]);

      await notificationController.getNotifications(req, res);

      expect(db.query).toHaveBeenCalledWith(expect.any(String), [1]);
      expect(res.json).toHaveBeenCalledWith([
        { Notification_ID: 1, Title: 'Test Event', Reminder_Time: '2023-11-25 10:00:00' },
      ]);
    });

    it('should handle database errors gracefully', async () => {
      const req = mockReq({}, {}, { userId: 1 });
      const res = mockRes();
      db.query.mockRejectedValueOnce(new Error('Database error'));

      await notificationController.getNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification successfully', async () => {
      const req = mockReq({}, { id: 1 }, { userId: 1 });
      const res = mockRes();
      db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      await notificationController.deleteNotification(req, res);

      expect(db.query).toHaveBeenCalledWith(expect.any(String), [1, 1]);
      expect(res.json).toHaveBeenCalledWith({ message: 'Notification deleted' });
    });

    it('should return 404 if the notification is not found', async () => {
      const req = mockReq({}, { id: 1 }, { userId: 1 });
      const res = mockRes();
      db.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

      await notificationController.deleteNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Notification not found' });
    });
  });

  describe('updateNotification', () => {
    it('should update a notification successfully', async () => {
      const req = mockReq({ newEventId: 2, newReminderId: 3 }, { id: 1 }, { userId: 1 });
      const res = mockRes();
      db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      await notificationController.updateNotification(req, res);

      expect(db.query).toHaveBeenCalledWith(expect.any(String), [2, 3, 1, 1]);
      expect(res.json).toHaveBeenCalledWith({ message: 'Notification updated successfully' });
    });

    it('should return 404 if no changes were made', async () => {
      const req = mockReq({ newEventId: 2, newReminderId: 3 }, { id: 1 }, { userId: 1 });
      const res = mockRes();
      db.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

      await notificationController.updateNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Notification not found or no changes made',
      });
    });
  });

  // addNotification test temporarily disabled
  xdescribe('addNotification', () => {
    xit('should create notifications and skip scheduling', async () => {
      const req = mockReq(
        { eventId: 1, reminderIds: [1, 2] },
        {},
        { userId: 1 }
      );
      const res = mockRes();

      const mockConnection = db.getConnection();
      mockConnection.query.mockResolvedValueOnce([{ StartDateTime: '2023-11-26T10:00:00' }]); // Fetch event time
      mockConnection.query.mockResolvedValueOnce({ insertId: 1 }); // Insert notification

      await notificationController.addNotification(req, res);

      expect(mockConnection.query).toHaveBeenCalledTimes(3);
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'Notifications created successfully' });
    });

    xit('should handle errors and rollback', async () => {
      const req = mockReq(
        { eventId: 1, reminderIds: [1, 2] },
        {},
        { userId: 1 }
      );
      const res = mockRes();

      const mockConnection = db.getConnection();
      mockConnection.query.mockRejectedValueOnce(new Error('Database error'));

      await notificationController.addNotification(req, res);

      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });
});
