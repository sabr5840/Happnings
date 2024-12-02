// test/CategoryController.test.js

const CategoryController = require('../controllers/CategoryController.js');
const axios = require('axios');

// Mock dependencies
jest.mock('axios');

describe('CategoryController', () => {
  let req, res;

  beforeAll(() => {
    process.env.TICKETMASTER_API_KEY = 'test_api_key'; // Use a test API key
  });

  beforeEach(() => {
    req = {};
    res = {
      json: jest.fn(),
      status: jest.fn(() => res),
    };
    jest.clearAllMocks();
    // Reset the cache between tests
    CategoryController.resetCache();
  });

  // Tests for fetchCategories
  describe('fetchCategories', () => {
    it('should fetch categories from Ticketmaster API and cache them', async () => {
      // Mock API response
      const mockData = {
        _embedded: {
          classifications: [
            { id: '1', name: 'Music', subClassifications: null },
            { id: '2', name: 'Sports', subClassifications: null },
            { id: '3', name: 'Arts & Theatre', subClassifications: null },
          ],
        },
      };
      axios.get.mockResolvedValueOnce({ data: mockData });

      const categories = await CategoryController.fetchCategories();

      expect(axios.get).toHaveBeenCalledWith(
        'https://app.ticketmaster.com/discovery/v2/classifications.json',
        { params: { apikey: 'test_api_key' } } // Expect the test API key
      );
      expect(categories).toEqual(mockData._embedded.classifications);
      // Check that categories are cached
      const cachedCategories = await CategoryController.fetchCategories();
      expect(cachedCategories).toEqual(categories);
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle errors and throw an error', async () => {
      axios.get.mockRejectedValueOnce(new Error('API error'));

      await expect(CategoryController.fetchCategories()).rejects.toThrow(
        'Error fetching categories from Ticketmaster'
      );
    });
  });

  // Tests for getCategories
  describe('getCategories', () => {
    it('should respond with categories', async () => {
      const categories = [{ id: '1', name: 'Music' }];
      // Mock fetchCategories
      jest.spyOn(CategoryController, 'fetchCategories').mockResolvedValueOnce(categories);

      await CategoryController.getCategories(req, res);

      expect(CategoryController.fetchCategories).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(categories);
    });

    it('should handle errors and respond with 500', async () => {
      // Mock fetchCategories to throw an error
      jest.spyOn(CategoryController, 'fetchCategories').mockRejectedValueOnce(new Error('API error'));

      await CategoryController.getCategories(req, res);

      expect(CategoryController.fetchCategories).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Ticketmaster API error' });
    });
  });
});