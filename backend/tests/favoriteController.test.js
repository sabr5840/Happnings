/**
 * FavoriteController.test.js
 */

const { addToFavorite, getFavorite, removeFromFavorite } = require('../../backend/controllers/FavoriteController');
const { db } = require('../../backend/config/firebaseAdmin');
const axios = require('axios');
const { format, parseISO } = require('date-fns');

// Mock dependencies
jest.mock('../../backend/config/firebaseAdmin', () => ({
  db: {
    collection: jest.fn(),
  },
}));

jest.mock('axios');

describe('FavoriteController', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Utility to mock request and response
  const mockRequest = (userData = {}, body = {}, params = {}) => ({
    user: userData,
    body,
    params,
  });

  const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  // ------------------------------------------------------------------------------
  // addToFavorite
  // ------------------------------------------------------------------------------
  describe('addToFavorite', () => {
    it('should return 400 if userId is missing or invalid', async () => {
      // user is undefined or missing uid
      const req = mockRequest({}, { eventId: 'someEventId' });
      const res = mockResponse();

      await addToFavorite(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid user ID in token',
      });
    });

    it('should return 400 if eventId is missing or invalid', async () => {
      const req = mockRequest({ uid: 'testUserId' }, { eventId: 123 /* not a string */ });
      const res = mockResponse();

      await addToFavorite(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid input data: eventId is missing or invalid',
      });
    });

    it('should return 404 if Ticketmaster API returns 404 (event not found)', async () => {
      const req = mockRequest({ uid: 'testUserId' }, { eventId: 'nonexistentEventId' });
      const res = mockResponse();

      // Mock axios to throw 404
      axios.get.mockRejectedValue({
        response: { status: 404 },
        message: 'Event not found',
      });

      await addToFavorite(req, res);
      expect(axios.get).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Event not found in Ticketmaster API',
      });
    });

    it('should return 500 if Ticketmaster API fails with non-404 error', async () => {
      const req = mockRequest({ uid: 'testUserId' }, { eventId: 'someEventId' });
      const res = mockResponse();

      // Mock axios for an internal server error
      axios.get.mockRejectedValue({
        response: { status: 500 },
        message: 'Server Error',
      });

      await addToFavorite(req, res);
      expect(axios.get).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to fetch event data',
      });
    });

    it('should return 404 if the event data from Ticketmaster is invalid', async () => {
      const req = mockRequest({ uid: 'testUserId' }, { eventId: 'someEventId' });
      const res = mockResponse();

      // Mock a successful axios response but missing `name` or `dates.start.localDate`
      axios.get.mockResolvedValue({
        status: 200,
        data: {
          // Missing 'name' and 'dates.start.localDate'
          _embedded: { venues: [] },
        },
      });

      await addToFavorite(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid event data from Ticketmaster API',
      });
    });

    it('should return 400 if event already exists in user favorites', async () => {
      const req = mockRequest({ uid: 'testUserId' }, { eventId: 'existingEventId' });
      const res = mockResponse();

      // Mock valid event data
      axios.get.mockResolvedValue({
        status: 200,
        data: {
          name: 'Cool Concert',
          dates: { start: { localDate: '2025-05-01' } },
          _embedded: {
            venues: [
              {
                address: { line1: '123 Street' },
                postalCode: '12345',
                city: { name: 'TestCity' },
              },
            ],
          },
        },
      });

      // Mock Firestore query that returns a non-empty snapshot -> event already in favorites
      const mockSnapshot = {
        empty: false,
        docs: [{}], 
      };
      db.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot),
      });

      await addToFavorite(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Event is already in favorites',
      });
    });

    it('should add a new favorite event successfully', async () => {
      const req = mockRequest({ uid: 'testUserId' }, { eventId: 'newEventId' });
      const res = mockResponse();

      // Mock valid event data
      axios.get.mockResolvedValue({
        status: 200,
        data: {
          name: 'Awesome Event',
          dates: { 
            start: { 
              localDate: '2025-08-15', 
              localTime: '20:00:00' 
            } 
          },
          priceRanges: [{ min: 100 }],
          images: [{ url: 'image_url' }],
          classifications: [{ genre: { name: 'Rock' } }],
          url: 'http://example.com/event',
          _embedded: {
            venues: [
              {
                name: 'Awesome Venue',
                address: { line1: '123 Street' },
                postalCode: '12345',
                city: { name: 'TestCity' },
              },
            ],
          },
        },
      });

      // Mock Firestore returns empty -> no existing favorite
      db.collection.mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true }),
      });

      // Mock db.collection for adding favorite
      db.collection.mockReturnValueOnce({
        add: jest.fn().mockResolvedValue({ id: 'generatedDocId' }),
      });

      await addToFavorite(req, res);
      expect(axios.get).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'Event added to favorite' });
    });
  });

  // ------------------------------------------------------------------------------
  // getFavorite
  // ------------------------------------------------------------------------------
  describe('getFavorite', () => {
    it('should return user favorites with formatted data', async () => {
      const req = mockRequest({ uid: 'testUserId' });
      const res = mockResponse();

      // Mock Firestore snapshot
      const mockDocs = [
        {
          data: () => ({
            eventId: 'event1',
            title: 'Event 1',
            date: '2025-07-10',
            time: '18:30:00',
            priceRange: 150,
            imageUrl: 'http://image1.jpg',
            venueAddress: JSON.stringify({
              line1: '123 Street',
              postalCode: '12345',
              city: 'City1',
            }),
          }),
        },
        {
          data: () => ({
            eventId: 'event2',
            title: 'Event 2',
            date: '2025-08-12',
            time: null, // No time
            priceRange: null,
            imageUrl: 'http://image2.jpg',
            venueAddress: null, // No address
          }),
        },
      ];
      db.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ docs: mockDocs }),
      });

      await getFavorite(req, res);
      expect(db.collection).toHaveBeenCalledWith('favorites');
      expect(res.json).toHaveBeenCalledWith([
        {
          eventId: 'event1',
          title: 'Event 1',
          date: expect.any(String), // e.g. 'Thursday, 10th of July'
          time: '18:30',
          price: '150 kr',
          image: 'http://image1.jpg',
          venueAddress: '123 Street, 12345 City1',
        },
        {
          eventId: 'event2',
          title: 'Event 2',
          date: expect.any(String), // e.g. 'Tuesday, 12th of August'
          time: 'Time not available',
          price: 'Not available',
          image: 'http://image2.jpg',
          venueAddress: 'Address not available',
        },
      ]);
    });

    it('should handle error when fetching favorites', async () => {
      const req = mockRequest({ uid: 'testUserId' });
      const res = mockResponse();

      db.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      await getFavorite(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'DB error' });
    });
  });

  // ------------------------------------------------------------------------------
  // removeFromFavorite
  // ------------------------------------------------------------------------------
  describe('removeFromFavorite', () => {
    it('should return 404 if the favorite document is not found', async () => {
      const req = mockRequest(
        { uid: 'testUserId' }, 
        {}, 
        { favoriteId: 'nonexistentEventId' }
      );
      const res = mockResponse();

      // Mock empty snapshot
      db.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true }),
      });

      await removeFromFavorite(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Favorite not found' });
    });

    it('should delete the document if found and return 200', async () => {
      const req = mockRequest({ uid: 'testUserId' }, {}, { favoriteId: 'eventToRemove' });
      const res = mockResponse();

      // Mock a snapshot with one doc
      const mockSnapshot = {
        empty: false,
        docs: [{ id: 'doc123', data: () => ({}) }],
      };

      db.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot),
        doc: jest.fn().mockReturnThis(),
        delete: jest.fn().mockResolvedValue(),
      });

      await removeFromFavorite(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Event removed from favorite' });
    });

    it('should handle internal server error', async () => {
      const req = mockRequest({ uid: 'testUserId' }, {}, { favoriteId: 'eventToRemove' });
      const res = mockResponse();

      db.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockRejectedValue(new Error('DB remove error')),
      });

      await removeFromFavorite(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
      });
    });
  });
});
