const categoryController = require('../controllers/CategoryController');
const db = require('../config/db');

// Mock db.query
jest.mock('../config/db', () => ({
  query: jest.fn(),
}));

// Mock request and response objects
const mockReq = (query = {}) => ({ query });
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('CategoryController', () => {
  describe('getFilteredAndSortedEvents', () => {
    it('should return events filtered by category IDs', async () => {
      // Mock data from the database
      const mockEvents = [
        { Event_ID: 1, Title: 'Rock Concert', Price: 250.00 },
        { Event_ID: 2, Title: 'Art Exhibition', Price: 100.00 },
      ];
      db.query.mockResolvedValueOnce([mockEvents]);

      const req = mockReq({ categoryIds: '1,2' });
      const res = mockRes();

      // Call the controller
      await categoryController.getFilteredAndSortedEvents(req, res);

      // Expectations
      expect(db.query).toHaveBeenCalledWith(
        expect.stringMatching(/WHERE Category\.Category_ID IN \(\?,\?\)/),
        ['1', '2']
      );
      expect(res.json).toHaveBeenCalledWith(mockEvents);
      expect(res.status).not.toHaveBeenCalled(); // No error status expected
    });

    it('should return events filtered by startDates', async () => {
      const mockEvents = [
        { Event_ID: 3, Title: 'Tech Conference', StartDateTime: '2024-12-01' },
      ];
      db.query.mockResolvedValueOnce([mockEvents]);

      const req = mockReq({ startDates: '2024-12-01' });
      const res = mockRes();

      await categoryController.getFilteredAndSortedEvents(req, res);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringMatching(/WHERE DATE\(Events\.StartDateTime\) IN \(\?\)/),
        ['2024-12-01']
      );
      expect(res.json).toHaveBeenCalledWith(mockEvents);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return sorted events by StartDateTime in ascending order', async () => {
      const mockEvents = [
        { Event_ID: 4, Title: 'Food Festival', StartDateTime: '2024-12-01T10:00:00' },
        { Event_ID: 5, Title: 'Jazz Night', StartDateTime: '2024-12-01T20:00:00' },
      ];
      db.query.mockResolvedValueOnce([mockEvents]);

      const req = mockReq({ sort: 'StartDateTime', order: 'asc' });
      const res = mockRes();

      await categoryController.getFilteredAndSortedEvents(req, res);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringMatching(/ORDER BY StartDateTime ASC/),
        []
      );
      expect(res.json).toHaveBeenCalledWith(mockEvents);
    });

    it('should return sorted events by Price in descending order', async () => {
      const mockEvents = [
        { Event_ID: 6, Title: 'Jazz Night', Price: 300.00 },
        { Event_ID: 7, Title: 'Food Festival', Price: 150.00 },
      ];
      db.query.mockResolvedValueOnce([mockEvents]);

      const req = mockReq({ sort: 'Price', order: 'desc' });
      const res = mockRes();

      await categoryController.getFilteredAndSortedEvents(req, res);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringMatching(/ORDER BY Price DESC/),
        []
      );
      expect(res.json).toHaveBeenCalledWith(mockEvents);
    });

    it('should handle no filters or sorting gracefully', async () => {
      const req = mockReq(); // No query params
      const res = mockRes();

      await categoryController.getFilteredAndSortedEvents(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Please provide at least one filter (categoryIds or startDates) or sorting option (sort).',
      });
    });

    it('should handle database errors gracefully', async () => {
      const mockError = new Error('Database error');
      db.query.mockRejectedValueOnce(mockError);

      const req = mockReq({ categoryIds: '1' });
      const res = mockRes();

      await categoryController.getFilteredAndSortedEvents(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: mockError.message });
    });
  });
});
