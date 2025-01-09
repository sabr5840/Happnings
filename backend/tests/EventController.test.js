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
  fetchEventsByCategory, 
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
    it('should fetch events successfully based on given parameters', async () => {
        const params = {
          apikey: 'testApiKey', // Ensure this is included as it's part of your actual function's call
          latlong: '55.6761,12.5683',
          radius: '10',
          startDateTime: '2025-01-01T00:00:00Z',
          endDateTime: '2025-01-02T00:00:00Z',
          classifications: 'Music' // Ret dette til den faktiske værdi brugt i din implementering
        };
        const expectedResponse = { data: { _embedded: { events: ['event1', 'event2'] } } };
      
        axios.get.mockResolvedValue(expectedResponse);
      
        const result = await fetchEventsByCategory(55.6761, 12.5683, '10', '2025-01-01T00:00:00Z', '2025-01-02T00:00:00Z', 'Music');
      
        expect(axios.get).toHaveBeenCalledWith('https://app.ticketmaster.com/discovery/v2/events.json', { params });
        expect(result).toEqual(['event1', 'event2']);
      });
      

    it('should handle errors from the Ticketmaster API', async () => {
      // Setup
      axios.get.mockRejectedValue(new Error('API error'));

      // Execute & Verify
      await expect(fetchEventsByCategory(55.6761, 12.5683, '10', '2025-01-01T00:00:00Z', '2025-01-02T00:00:00Z', 'Music'))
        .rejects.toThrow('Error fetching events from Ticketmaster');
    });

    it('should return an empty array if no events are found', async () => {
      // Setup
      const expectedResponse = { data: {} };
      axios.get.mockResolvedValue(expectedResponse);

      // Execute
      const result = await fetchEventsByCategory(55.6761, 12.5683, '10', '2025-01-01T00:00:00Z', '2025-01-02T00:00:00Z', 'Music');

      // Verify
      expect(result).toEqual([]);
    });
  });

  
});