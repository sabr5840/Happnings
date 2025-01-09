/**
 * EventController.test.js
 */

const axios = require('axios');
const NodeCache = require('node-cache');
const {
  fetchEventsByLocation,
  fetchSameDayEvents,
  fetchEventsByKeyword,
  fetchUpcomingEvents,
  getCoordinatesFromAddress,
} = require('../controllers/EventController');

// Mock axios and NodeCache
jest.mock('axios');
jest.mock('node-cache');

describe('EventController', () => {
  let originalEnv;
  let cache;

  beforeAll(() => {
    originalEnv = { ...process.env };
    process.env.TICKETMASTER_API_KEY = 'testApiKey';
    cache = new NodeCache();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    cache.flushAll();
    jest.clearAllMocks();
  });

  describe('fetchEventsByLocation', () => {
    it('should fetch events from the Ticketmaster API based on location parameters', async () => {
      axios.get.mockResolvedValue({
        data: {
          _embedded: { events: [{ id: '1', name: 'Concert' }] }
        }
      });

      const events = await fetchEventsByLocation(55.6761, 12.5683, 10, '2020-01-01T00:00:00Z', '2020-01-02T00:00:00Z', 'music');
      expect(axios.get).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        params: expect.objectContaining({ latlong: '55.6761,12.5683' })
      }));
      expect(events).toEqual([{ id: '1', name: 'Concert' }]);
    });
  });

  describe('fetchSameDayEvents', () => {
    it('should fetch events for the same day within a specified radius', async () => {
      axios.get.mockResolvedValue({
        data: {
          _embedded: { events: [{ id: '1', name: 'Local Event' }] }
        }
      });

      const events = await fetchSameDayEvents(55.6761, 12.5683);
      expect(axios.get).toHaveBeenCalled();
      expect(events).toEqual([{ id: '1', name: 'Local Event' }]);
    });
  });

  describe('fetchEventsByKeyword', () => {
    it('should fetch events based on a keyword and location parameters', async () => {
      axios.get.mockResolvedValue({
        data: {
          _embedded: { events: [{ id: '1', name: 'Keyword Event' }] }
        }
      });

      const events = await fetchEventsByKeyword('festival', 55.6761, 12.5683, 10, '2020-01-01T00:00:00Z', '2020-01-02T00:00:00Z');
      expect(axios.get).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        params: expect.objectContaining({ keyword: 'festival' })
      }));
      expect(events).toEqual([{ id: '1', name: 'Keyword Event' }]);
    });
  });

  describe('fetchUpcomingEvents', () => {
    it('should fetch upcoming events within a specified radius', async () => {
      axios.get.mockResolvedValue({
        data: {
          _embedded: { events: [{ id: '1', name: 'Upcoming Event' }] }
        }
      });

      const events = await fetchUpcomingEvents(55.6761, 12.5683);
      expect(axios.get).toHaveBeenCalled();
      expect(events).toEqual([{ id: '1', name: 'Upcoming Event' }]);
    });
  });

  describe('getCoordinatesFromAddress', () => {
    it('should convert an address to coordinates using the Google Geocoding API', async () => {
      axios.get.mockResolvedValue({
        data: {
          results: [{
            geometry: {
              location: { lat: 55.6761, lng: 12.5683 }
            }
          }]
        }
      });

      const coordinates = await getCoordinatesFromAddress('Copenhagen');
      expect(axios.get).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        params: expect.objectContaining({ address: 'Copenhagen' })
      }));
      expect(coordinates).toEqual({ lat: 55.6761, lng: 12.5683 });
    });
  });

  describe('fetchEventsByCategory', () => {
    it('should fetch events based on category and location parameters', async () => {
      // Mock data for axios call
      const mockEvents = {
        _embedded: {
          events: [
            { id: '1', name: 'Category Event 1' },
            { id: '2', name: 'Category Event 2' }
          ]
        }
      };
      axios.get.mockResolvedValue({ data: mockEvents });
  
      // Parameters to pass to the function
      const userLatitude = 55.6761;
      const userLongitude = 12.5683;
      const radius = 10; // in km
      const startDateTime = '2020-01-01T00:00:00Z';
      const endDateTime = '2020-01-02T00:00:00Z';
      const category = 'music';
  
      // Fetch events by category
      const events = await fetchEventsByCategory(userLatitude, userLongitude, radius, startDateTime, endDateTime, category);
  
      // Check if axios was called correctly
      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String), 
        expect.objectContaining({
          params: expect.objectContaining({
            latlong: `${userLatitude},${userLongitude}`,
            radius,
            startDateTime,
            endDateTime,
            classifications: expect.any(String) // This depends on the implementation of getSubCategoriesForSegment
          })
        })
      );
  
      // Check the response
      expect(events).toEqual(mockEvents._embedded.events);
    });
  
    it('should handle errors from the API call', async () => {
      // Simulate an API error
      axios.get.mockRejectedValue(new Error('API failure'));
  
      // Parameters to pass to the function
      const userLatitude = 55.6761;
      const userLongitude = 12.5683;
      const radius = 10; // in km
      const startDateTime = '2020-01-01T00:00:00Z';
      const endDateTime = '2020-01-02T00:00:00Z';
      const category = 'music';
  
      // Attempt to fetch events and expect an error
      await expect(fetchEventsByCategory(userLatitude, userLongitude, radius, startDateTime, endDateTime, category))
        .rejects.toThrow('API failure');
    });
  });
  
});