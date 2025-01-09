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
  fetchClassifications,
  getSubCategoriesForSegment
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
      const mockEvents = [{ id: '1', name: 'Concert' }];
      axios.get.mockResolvedValue({
        data: {
          _embedded: { events: mockEvents }
        }
      });

      const events = await fetchEventsByLocation(55.6761, 12.5683, 10, '2020-01-01T00:00:00Z', '2020-01-02T00:00:00Z', 'music');
      expect(axios.get).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        params: expect.objectContaining({ latlong: '55.6761,12.5683' })
      }));
      expect(events).toEqual(mockEvents);
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
    });

    it('should return cached data if not expired', async () => {
      // Simulate a cached value that hasn't expired
      cachedClassifications = [{ id: '1', name: 'Concert' }];
      classificationCacheTimestamp = Date.now();

      const classifications = await fetchClassifications();
      expect(axios.get).not.toHaveBeenCalled(); // Axios should not be called since the data is cached
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

});
