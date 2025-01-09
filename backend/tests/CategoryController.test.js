/**
 * CategoryController.test.js
 */

const axios = require('axios');
const { getCategories, resetCache } = require('../controllers/CategoryController');

// Mock axios
jest.mock('axios');

describe('CategoryController', () => {
  let originalEnv;

  beforeAll(() => {
    // Save original environment variables
    originalEnv = { ...process.env };
    process.env.TICKETMASTER_API_KEY = 'testApiKey'; // Provide a mock API key for tests
  });

  afterAll(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset the cachedCategories and cacheTimestamp
    resetCache();
  });

  // Utility to mock Express request/response
  const mockRequest = () => ({});
  const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  describe('getCategories', () => {
    it('should return categories from the Ticketmaster API if cache is empty', async () => {
      const req = mockRequest();
      const res = mockResponse();

      // Mock a successful Ticketmaster API response
      axios.get.mockResolvedValue({
        data: {
          _embedded: {
            classifications: [
              {
                segment: { id: 'KZFzBErXgnZfZ7v7nJ', name: 'Music' },
              },
              {
                segment: { id: 'KZFzBErXgnZfZ7v7nE', name: 'Sports' },
              },
              {
                // Missing segment.name—should be filtered out
                segment: { id: 'KZFzBErXgnZfZ7v7nX', name: '' },
              },
            ],
          },
        },
      });

      await getCategories(req, res);
      expect(axios.get).toHaveBeenCalledWith(
        'https://app.ticketmaster.com/discovery/v2/classifications.json',
        { params: { apikey: 'testApiKey' } }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        { id: 'KZFzBErXgnZfZ7v7nJ', name: 'Music' },
        { id: 'KZFzBErXgnZfZ7v7nE', name: 'Sports' },
      ]);
    });

    it('should reuse cached categories if available and within cache duration', async () => {
      // First call to getCategories to fill the cache
      const req1 = mockRequest();
      const res1 = mockResponse();

      axios.get.mockResolvedValueOnce({
        data: {
          _embedded: {
            classifications: [
              { segment: { id: '1', name: 'FirstCategory' } },
            ],
          },
        },
      });

      await getCategories(req1, res1);
      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(res1.json).toHaveBeenCalledWith([
        { id: '1', name: 'FirstCategory' },
      ]);

      // Second call to getCategories (immediately after) should use the cache
      const req2 = mockRequest();
      const res2 = mockResponse();

      await getCategories(req2, res2);
      expect(axios.get).toHaveBeenCalledTimes(1); // still 1, no new call
      expect(res2.json).toHaveBeenCalledWith([
        { id: '1', name: 'FirstCategory' },
      ]);
    });

    it('should throw an error if the API response is malformed (missing _embedded)', async () => {
      const req = mockRequest();
      const res = mockResponse();

      axios.get.mockResolvedValue({
        data: {}, // no _embedded
      });

      await getCategories(req, res);
      expect(axios.get).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error fetching categories from Ticketmaster',
      });
    });

    it('should handle axios errors properly and return status 500', async () => {
      const req = mockRequest();
      const res = mockResponse();

      // Simulate Axios request failure
      axios.get.mockRejectedValue(new Error('Network Error'));

      await getCategories(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error fetching categories from Ticketmaster',
      });
    });

    it('should return an error message if an unexpected error occurs', async () => {
      const req = mockRequest();
      const res = mockResponse();

      // Force an unexpected error scenario
      axios.get.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await getCategories(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error fetching categories from Ticketmaster',
      });
    });
  });

  describe('resetCache', () => {
    it('should clear the cachedCategories and cacheTimestamp', async () => {
      // Step 1: Populate cache
      const req = mockRequest();
      const res = mockResponse();

      axios.get.mockResolvedValue({
        data: {
          _embedded: {
            classifications: [
              { segment: { id: '1', name: 'FirstCategory' } },
            ],
          },
        },
      });

      await getCategories(req, res); // first call populates cache
      expect(axios.get).toHaveBeenCalledTimes(1);

      // Step 2: reset the cache
      resetCache();

      // Step 3: call getCategories again -> should fetch from axios again
      const req2 = mockRequest();
      const res2 = mockResponse();

      await getCategories(req2, res2);
      expect(axios.get).toHaveBeenCalledTimes(2); // indicates fresh fetch
    });
  });
});
