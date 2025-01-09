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


  describe('fetchClassifications', () => {
    it('should fetch and cache classifications when cache is expired or empty', async () => {
      axios.get.mockResolvedValue({
        data: {
          _embedded: {
            classifications: [{ id: '1', name: 'Concert' }]
          }
        }
      });
  
      const classifications = await fetchClassifications();
      expect(axios.get).toHaveBeenCalledWith(
        'https://app.ticketmaster.com/discovery/v2/classifications.json',
        { params: { apikey: 'testApiKey' } }
      );
      expect(classifications).toEqual([{ id: '1', name: 'Concert' }]);
      expect(myCache.set).toHaveBeenCalledWith('classifications', [{ id: '1', name: 'Concert' }], 86400);
    });
  
    it('should return cached data if not expired', async () => {
      myCache.get.mockReturnValue([{ id: '1', name: 'Concert' }]);
      const classifications = await fetchClassifications();
      expect(axios.get).not.toHaveBeenCalled();
      expect(classifications).toEqual([{ id: '1', name: 'Concert' }]);
    });
  });

  describe('getSubCategoriesForSegment', () => {
    it('should return subcategories IDs for a given segment', async () => {
      jest.spyOn(global, 'fetchClassifications').mockResolvedValue([
        { segment: { id: '1', name: 'Music' }, genre: { id: '10', name: 'Rock' } },
        { segment: { id: '2', name: 'Sports' } }
      ]);
  
      const ids = await getSubCategoriesForSegment('Music');
      expect(ids).toEqual('1,10');
    });
  
    it('should return an empty string if no matching segment is found', async () => {
      jest.spyOn(global, 'fetchClassifications').mockResolvedValue([
        { segment: { id: '2', name: 'Sports' } }
      ]);
  
      const ids = await getSubCategoriesForSegment('Comedy');
      expect(ids).toBe('');
    });
  });

  describe('fetchEventsByCategory', () => {
    it('should fetch events based on category specifications', async () => {
      axios.get.mockResolvedValue({
        data: {
          _embedded: { events: [{ id: '1', name: 'Basketball Game' }] }
        }
      });
  
      jest.spyOn(global, 'getSubCategoriesForSegment').mockResolvedValue('sports,football');
  
      const events = await fetchEventsByCategory(55.6761, 12.5683, 10, '2020-01-01T00:00:00Z', '2020-01-02T00:00:00Z', 'sports');
      expect(axios.get).toHaveBeenCalledWith(
        'https://app.ticketmaster.com/discovery/v2/events.json',
        expect.objectContaining({
          params: expect.objectContaining({
            latlong: '55.6761,12.5683',
            radius: 10,
            classifications: 'sports,football'
          })
        })
      );
      expect(events).toEqual([{ id: '1', name: 'Basketball Game' }]);
    });
  
    it('should handle API errors appropriately', async () => {
      axios.get.mockRejectedValue(new Error('API failure'));
      await expect(fetchEventsByCategory(55.6761, 12.5683, 10, '2020-01-01T00:00:00Z', '2020-01-02T00:00:00Z', 'sports')).rejects.toThrow('API failure');
    });
  });
  

});
