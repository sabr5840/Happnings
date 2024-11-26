const categoryController = require('../controllers/CategoryController');
const db = require('../config/db');

// Mock db.query
jest.mock('../config/db', () => ({
  query: jest.fn(),
}));

// Mock request og response objekter
const mockReq = () => ({});
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('CategoryController', () => {
  describe('getCategories', () => {
    it('should return categories successfully', async () => {
      // Mock data fra databasen
      const mockCategories = [
        { Category_ID: 1, Name: 'Food' },
        { Category_ID: 2, Name: 'Travel' },
      ];
      db.query.mockResolvedValueOnce([mockCategories]);

      const req = mockReq();
      const res = mockRes();

      // Kald controlleren
      await categoryController.getCategories(req, res);

      // Forventninger
      expect(db.query).toHaveBeenCalledWith('SELECT Category_ID, Name FROM Category');
      expect(res.json).toHaveBeenCalledWith(mockCategories);
      expect(res.status).not.toHaveBeenCalled(); // Ingen fejlstatus forventet
    });

    it('should handle database errors gracefully', async () => {
      // Mock en fejl fra databasen
      const mockError = new Error('Database error');
      db.query.mockRejectedValueOnce(mockError);

      const req = mockReq();
      const res = mockRes();

      // Kald controlleren
      await categoryController.getCategories(req, res);

      // Forventninger
      expect(db.query).toHaveBeenCalledWith('SELECT Category_ID, Name FROM Category');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: mockError.message });
    });
  });
});
