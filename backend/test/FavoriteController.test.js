const favoriteController = require('../controllers/FavoriteController.js');
const db = require('../config/db');

// Mock db.query
jest.mock('../config/db', () => ({
  query: jest.fn(),
}));

// Mock request and response objects
const mockReq = (body = {}, params = {}, session = { userId: null }) => ({
  body,
  params,
  session,
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res); // Chainable
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('FavoriteController', () => {
  describe('addToFavorite', () => {
    it('should return 400 if eventId is missing', async () => {
      const req = mockReq(); // Missing eventId
      const res = mockRes();

      await favoriteController.addToFavorite(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Event ID is required' });
    });

    it('should return 404 if the event does not exist', async () => {
      const req = mockReq({ eventId: 1 }, {}, { userId: 1 });
      const res = mockRes();
      db.query.mockResolvedValueOnce([[]]); // No event found

      await favoriteController.addToFavorite(req, res);

      expect(db.query).toHaveBeenCalledWith('SELECT * FROM Events WHERE Event_ID = ?', [1]);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Event not found' });
    });

    it('should return 400 if the event is already in favorites', async () => {
      const req = mockReq({ eventId: 1 }, {}, { userId: 1 });
      const res = mockRes();
      db.query.mockResolvedValueOnce([[{ Event_ID: 1 }]]); // Event exists
      db.query.mockResolvedValueOnce([[{ Favorite_ID: 1 }]]); // Already in favorites

      await favoriteController.addToFavorite(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Event is already in favorite' });
    });

    it('should add the event to favorites', async () => {
      const req = mockReq({ eventId: 1 }, {}, { userId: 1 });
      const res = mockRes();
      db.query.mockResolvedValueOnce([[{ Event_ID: 1 }]]); // Event exists
      db.query.mockResolvedValueOnce([[]]); // Not in favorites
      db.query.mockResolvedValueOnce([{ insertId: 1 }]); // Insert successful

      await favoriteController.addToFavorite(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'Event added to favorite' });
    });
  });

  describe('getFavorite', () => {
    it('should return the user\'s favorite events', async () => {
      const req = mockReq({}, {}, { userId: 1 });
      const res = mockRes();
      db.query.mockResolvedValueOnce([
        [
          {
            Favorite_ID: 1,
            Event_ID: 1,
            Title: 'Event 1',
            Description: 'Description 1',
            StartDateTime: '2024-12-10T10:00:00.000Z',
            Image_URL: 'http://example.com/image1.jpg',
          },
        ],
      ]);

      await favoriteController.getFavorite(req, res);

      expect(db.query).toHaveBeenCalledWith(
        `SELECT f.Favorite_ID, e.Event_ID, e.Title, e.Description, e.StartDateTime, e.Image_URL
         FROM Favorite f
         JOIN Events e ON f.Event_ID = e.Event_ID
         WHERE f.User_ID = ?`,
        [1]
      );
      expect(res.json).toHaveBeenCalledWith([
        {
          Favorite_ID: 1,
          Event_ID: 1,
          Title: 'Event 1',
          Description: 'Description 1',
          StartDateTime: '2024-12-10T10:00:00.000Z',
          Image_URL: 'http://example.com/image1.jpg',
        },
      ]);
    });

    it('should handle errors gracefully', async () => {
      const req = mockReq({}, {}, { userId: 1 });
      const res = mockRes();
      db.query.mockRejectedValueOnce(new Error('Database error'));

      await favoriteController.getFavorite(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('removeFromFavorite', () => {
    it('should return 404 if the favorite does not exist', async () => {
      const req = mockReq({}, { favoriteId: 1 }, { userId: 1 });
      const res = mockRes();
      db.query.mockResolvedValueOnce([{ affectedRows: 0 }]); // No rows affected

      await favoriteController.removeFromFavorite(req, res);

      expect(db.query).toHaveBeenCalledWith(
        'DELETE FROM Favorite WHERE Favorite_ID = ? AND User_ID = ?',
        [1, 1]
      );
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Favorite not found' });
    });

    it('should remove the favorite', async () => {
        const req = mockReq({}, { favoriteId: 1 }, { userId: 1 });
        const res = mockRes();
  
        // Simuler, at db.query returnerer, at én række blev slettet
        db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
  
        // Kald funktionen
        await favoriteController.removeFromFavorite(req, res);
  
        // Debugging af mock-kald
        console.log('Mock calls to db.query:', db.query.mock.calls);
        console.log('Mock calls to res.status:', res.status.mock.calls);
        console.log('Mock calls to res.json:', res.json.mock.calls);
  
        // Tjek at den rigtige SQL-forespørgsel blev lavet
        expect(db.query).toHaveBeenCalledWith(
          'DELETE FROM Favorite WHERE Favorite_ID = ? AND User_ID = ?',
          [1, 1]
        );
  
        // Tjek at status og json blev kaldt korrekt
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: 'Event removed from favorite' });
      });

    it('should handle errors gracefully', async () => {
      const req = mockReq({}, { favoriteId: 1 }, { userId: 1 });
      const res = mockRes();
      db.query.mockRejectedValueOnce(new Error('Database error'));

      await favoriteController.removeFromFavorite(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });
});