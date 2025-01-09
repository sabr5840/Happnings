/**
 * userController.test.js
 */

const { 
  registerUser, 
  loginUser, 
  logoutUser, 
  getUsers, 
  getUserById, 
  updateUser, 
  deleteUser 
} = require('../controllers/userController');

const { db, admin } = require('../config/firebaseAdmin');
const fetch = require('node-fetch');

// Mock the Firebase Admin SDK
jest.mock('../../backend/config/firebaseAdmin', () => ({
  db: {
    collection: jest.fn(),
  },
  admin: {
    auth: jest.fn(),
  },
}));

// Mock node-fetch
jest.mock('node-fetch', () => jest.fn());

// Utility to mock Express request/response
const mockRequest = (body = {}, session = {}) => ({
  body,
  params: {},
  session,
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json  = jest.fn().mockReturnValue(res);
  res.send  = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

describe('User Controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------
  // registerUser
  // ---------------------------------------
  describe('registerUser', () => {
    it('should return 400 if required fields are missing', async () => {
      const req = mockRequest({}); // no name, email, password
      const res = mockResponse();

      await registerUser(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Missing required fields',
      });
    });

    it('should create a user in Firebase Auth and Firestore', async () => {
      // Mock request
      const req = mockRequest({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });
      const res = mockResponse();

      // Mock admin.auth().createUser response
      admin.auth.mockReturnValue({
        createUser: jest.fn().mockResolvedValue({
          uid: 'testUid',
        }),
      });

      // Mock Firestore db calls
      const docMock = {
        set: jest.fn().mockResolvedValue(),
      };
      db.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(docMock),
      });

      await registerUser(req, res);

      expect(admin.auth).toHaveBeenCalled();
      expect(db.collection).toHaveBeenCalledWith('users');
      expect(docMock.set).toHaveBeenCalledWith({
        Name: 'Test User',
        Email: 'test@example.com',
        Date_of_registration: expect.any(Date),
        FCM_Token: null,
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User registered successfully',
        userId: 'testUid',
      });
    });

    it('should handle email-already-in-use error', async () => {
      const req = mockRequest({
        name: 'Test User',
        email: 'taken@example.com',
        password: 'password123',
      });
      const res = mockResponse();

      admin.auth.mockReturnValue({
        createUser: jest.fn().mockRejectedValue({
          errorInfo: { code: 'auth/email-already-in-use' },
        }),
      });

      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'auth/email-already-in-use',
          message: 'The email address is already in use by another account.',
        },
      });
    });

    it('should handle unexpected errors', async () => {
      const req = mockRequest({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });
      const res = mockResponse();

      admin.auth.mockReturnValue({
        createUser: jest.fn().mockRejectedValue(new Error('Unexpected error')),
      });

      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unexpected error',
      });
    });
  });

  // ---------------------------------------
  // loginUser
  // ---------------------------------------
  describe('loginUser', () => {
    it('should return 400 if required fields are missing', async () => {
      const req = mockRequest({}); // no email, password
      const res = mockResponse();

      await loginUser(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Missing required fields',
      });
    });

    it('should login user with valid credentials', async () => {
      const req = mockRequest({
        email: 'test@example.com',
        password: 'password123',
      });
      const res = mockResponse();

      // Mock fetch response
      fetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              localId: 'testLocalId',
              idToken: 'testIdToken',
            }),
        })
      );

      await loginUser(req, res);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('accounts:signInWithPassword'),
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith({
        message: 'Login successful',
        userId: 'testLocalId',
        token: 'testIdToken',
      });
      expect(req.session.userId).toBe('testLocalId');
    });

    it('should handle invalid credentials', async () => {
      const req = mockRequest({
        email: 'wrong@example.com',
        password: 'wrongpass',
      });
      const res = mockResponse();

      // Mock fetch response with error
      fetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          json: () =>
            Promise.resolve({
              error: 'Invalid credentials',
            }),
        })
      );

      await loginUser(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid credentials',
        error: { error: 'Invalid credentials' },
      });
    });

    it('should handle fetch errors gracefully', async () => {
      const req = mockRequest({
        email: 'test@example.com',
        password: 'password123',
      });
      const res = mockResponse();

      // Mock fetch rejection
      fetch.mockImplementationOnce(() => Promise.reject(new Error('Fetch error')));

      await loginUser(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Fetch error',
      });
    });
  });

  // ---------------------------------------
  // logoutUser
  // ---------------------------------------
  describe('logoutUser', () => {
    it('should destroy session and return success message', () => {
      const req = {
        session: {
          destroy: jest.fn((cb) => cb(null)),
        },
      };
      const res = mockResponse();

      logoutUser(req, res);
      expect(req.session.destroy).toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith('connect.sid');
      expect(res.json).toHaveBeenCalledWith({ message: 'Logout successful' });
    });

    it('should handle session destroy error', () => {
      const req = {
        session: {
          destroy: jest.fn((cb) => cb(new Error('Session error'))),
        },
      };
      const res = mockResponse();

      logoutUser(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Logout failed',
        error: 'Session error',
      });
    });

    it('should return 400 if no session found', () => {
      const req = {};
      const res = mockResponse();

      logoutUser(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'No session found' });
    });
  });

  // ---------------------------------------
  // getUsers
  // ---------------------------------------
  describe('getUsers', () => {
    it('should retrieve all users', async () => {
      const req = mockRequest();
      const res = mockResponse();

      const docData = [
        { id: 'user1', data: () => ({ Name: 'User1' }) },
        { id: 'user2', data: () => ({ Name: 'User2' }) },
      ];

      db.collection.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: docData,
        }),
      });

      await getUsers(req, res);

      expect(db.collection).toHaveBeenCalledWith('users');
      expect(res.json).toHaveBeenCalledWith([
        { userId: 'user1', Name: 'User1' },
        { userId: 'user2', Name: 'User2' },
      ]);
    });

    it('should handle errors', async () => {
      const req = mockRequest();
      const res = mockResponse();

      db.collection.mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      await getUsers(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'DB error' });
    });
  });

  // ---------------------------------------
  // getUserById
  // ---------------------------------------
  describe('getUserById', () => {
    it('should return user data if exists', async () => {
      const req = { params: { id: 'testId' } };
      const res = mockResponse();

      db.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: 'testId',
            data: () => ({ Name: 'Test User' }),
          }),
        }),
      });

      await getUserById(req, res);
      expect(res.json).toHaveBeenCalledWith({
        userId: 'testId',
        Name: 'Test User',
      });
    });

    it('should return 404 if user not found', async () => {
      const req = { params: { id: 'nonExistentId' } };
      const res = mockResponse();

      db.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: false,
          }),
        }),
      });

      await getUserById(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should handle errors', async () => {
      const req = { params: { id: 'testId' } };
      const res = mockResponse();

      db.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockRejectedValue(new Error('DB error')),
        }),
      });

      await getUserById(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'DB error' });
    });
  });

  // ---------------------------------------
  // updateUser
  // ---------------------------------------
  describe('updateUser', () => {
    it('should update user in Firebase Auth and Firestore', async () => {
      const req = {
        params: { id: 'testId' },
        body: {
          name: 'New Name',
          email: 'newemail@example.com',
          password: 'newpass123',
        },
      };
      const res = mockResponse();

      // Mock admin.auth().updateUser
      admin.auth.mockReturnValue({
        updateUser: jest.fn().mockResolvedValue(),
      });

      // Mock db.collection
      db.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          update: jest.fn().mockResolvedValue(),
        }),
      });

      await updateUser(req, res);

      expect(admin.auth).toHaveBeenCalled();
      expect(db.collection).toHaveBeenCalledWith('users');
      expect(res.json).toHaveBeenCalledWith({ message: 'User updated successfully' });
    });

    it('should handle errors', async () => {
      const req = {
        params: { id: 'testId' },
        body: {
          email: 'fail@example.com',
        },
      };
      const res = mockResponse();

      admin.auth.mockReturnValue({
        updateUser: jest.fn().mockRejectedValue(new Error('Auth error')),
      });

      await updateUser(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Auth error',
      });
    });
  });

  // ---------------------------------------
  // deleteUser
  // ---------------------------------------
  describe('deleteUser', () => {
    it('should return 403 if session user is not the same as request id', async () => {
      const req = {
        params: { id: 'otherUserId' },
        session: { userId: 'sessionUserId' },
      };
      const res = mockResponse();

      await deleteUser(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'You are not authorized to delete this account',
      });
    });

    it('should delete user from Firebase Auth and Firestore', async () => {
      const req = {
        params: { id: 'testId' },
        session: { userId: 'testId' },
      };
      const res = mockResponse();

      admin.auth.mockReturnValue({
        deleteUser: jest.fn().mockResolvedValue(),
      });
      db.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          delete: jest.fn().mockResolvedValue(),
        }),
      });

      req.session.destroy = jest.fn();

      await deleteUser(req, res);

      expect(admin.auth).toHaveBeenCalled();
      expect(db.collection).toHaveBeenCalledWith('users');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'User deleted successfully' });
      expect(req.session.destroy).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const req = {
        params: { id: 'testId' },
        session: { userId: 'testId' },
      };
      const res = mockResponse();

      admin.auth.mockReturnValue({
        deleteUser: jest.fn().mockRejectedValue(new Error('Delete error')),
      });

      await deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Delete error',
      });
    });
  });
});
