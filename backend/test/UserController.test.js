
const userController = require('../controllers/userController.js');
const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Mock db.query and bcrypt
jest.mock('../config/db', () => ({
  query: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock request and response objects
const mockReq = (body = {}, params = {}) => ({
  body,
  params,
  session: {
    userId: null,
    save: jest.fn((callback) => callback && callback()), // Mock for session.save
  },
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

describe('userController', () => {
  describe('registerUser', () => {
    it('should return 400 if required fields are missing', async () => {
      const req = mockReq({});
      const res = mockRes();

      await userController.registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Missing required fields' });
    });

    it('should return 400 if user already exists', async () => {
      const req = mockReq({ name: 'John', email: 'john@example.com', password: '123456' });
      const res = mockRes();
      db.query.mockResolvedValueOnce([[{ Email: 'john@example.com' }]]);

      await userController.registerUser(req, res);

      expect(db.query).toHaveBeenCalledWith('SELECT * FROM User WHERE Email = ?', ['john@example.com']);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'User already exists' });
    });

    it('should return 201 and register the user', async () => {
      const req = mockReq({ name: 'John', email: 'john@example.com', password: '123456' });
      const res = mockRes();
      db.query.mockResolvedValueOnce([[]]); // No existing user
      bcrypt.hash.mockResolvedValueOnce('hashed_password');
      db.query.mockResolvedValueOnce([{ insertId: 1 }]); // Mock successful insert

      await userController.registerUser(req, res);

      expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10);
      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO User (Name, Email, Password, FCM_Token) VALUES (?, ?, ?, ?)',
        ['John', 'john@example.com', 'hashed_password', expect.stringContaining('fcm_token_')]
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'User registered successfully', userId: 1 });
    });

    it('should handle errors gracefully', async () => {
      const req = mockReq({ name: 'John', email: 'john@example.com', password: '123456' });
      const res = mockRes();
      db.query.mockRejectedValueOnce(new Error('Database error'));

      await userController.registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('loginUser', () => {
    it('should login the user successfully', async () => {
      const req = mockReq({ email: 'john@example.com', password: '123456', token: 'fcm_token' });
      const res = mockRes();

      // Mock database query to find the user
      db.query.mockResolvedValueOnce([[{ User_ID: 1, Password: 'hashed_password' }]]);
      // Mock bcrypt.compare to validate password
      bcrypt.compare.mockResolvedValueOnce(true);

      await userController.loginUser(req, res);

      expect(req.session.userId).toBe(1); // Verify session user ID is set
      expect(res.json).toHaveBeenCalledWith({ message: 'Login successful', token: 'fcm_token' });
    });

    it('should return 401 for incorrect password', async () => {
      const req = mockReq({ email: 'john@example.com', password: 'wrongpassword' });
      const res = mockRes();
      db.query.mockResolvedValueOnce([[{ Email: 'john@example.com', Password: 'hashed_password' }]]);
      bcrypt.compare.mockResolvedValueOnce(false);

      await userController.loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Incorrect password' });
    });

    it('should handle database errors gracefully', async () => {
      const req = mockReq({ email: 'john@example.com', password: '123456' });
      const res = mockRes();
      db.query.mockRejectedValueOnce(new Error('Database error'));

      await userController.loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });
});
