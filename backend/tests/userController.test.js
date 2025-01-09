// backend/tests/EventController.test.js

require('dotenv').config();
const axios = require('axios');
const NodeCache = require('node-cache');
const {
  fetchEventsByLocation,
  fetchSameDayEvents,
  fetchUpcomingEvents,
  getEventById,
  getCoordinatesFromAddress,
  getEvents,
  getEventsKeyword,
  fetchEventsByKeyword,
  fetchEventsByCategory,
  fetchEventsByCategories,
} = require('../controllers/EventController');

jest.mock('axios');
jest.mock('node-cache');

describe('EventController', () => {
  const TICKETMASTER_API_KEY = 'test_api_key';
  const GEOCODING_API_KEY = 'test_geocoding_key';

  let myCacheMock;

  beforeAll(() => {
    process.env.TICKETMASTER_API_KEY = TICKETMASTER_API_KEY;
    process.env.API_KEY_GEOCODING = GEOCODING_API_KEY;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    myCacheMock = {
      get: jest.fn(),
      set: jest.fn(),
    };
    NodeCache.mockImplementation(() => myCacheMock);
  });

  // ------------------------------------------------------------------------------
  // fetchEventsByLocation
  // ------------------------------------------------------------------------------
  describe('fetchEventsByLocation', () => {
    it('should fetch events and cache them', async () => {
      const mockData = {
        _embedded: {
          events: [{ id: '1', name: 'Test Event' }],
        },
      };
      axios.get.mockResolvedValue({ data: mockData });

      const events = await fetchEventsByLocation(
        55.6761,
        12.5683,
        10,
        '2025-01-01T00:00:00Z',
        '2025-01-01T23:59:59Z',
        'music'
      );

      expect(myCacheMock.get).toHaveBeenCalledWith(
        'events_55.6761_12.5683_10_2025-01-01T00:00:00Z_2025-01-01T23:59:59Z_music'
      );
      expect(axios.get).toHaveBeenCalledWith('https://app.ticketmaster.com/discovery/v2/events.json', {
        params: {
          apikey: TICKETMASTER_API_KEY,
          latlong: '55.6761,12.5683',
          radius: 10,
          startDateTime: '2025-01-01T00:00:00Z',
          endDateTime: '2025-01-01T23:59:59Z',
          classificationName: 'music',
          sort: 'date,asc',
        },
      });
      expect(myCacheMock.set).toHaveBeenCalledWith(
        'events_55.6761_12.5683_10_2025-01-01T00:00:00Z_2025-01-01T23:59:59Z_music',
        [{ id: '1', name: 'Test Event' }],
        100
      );
      expect(events).toEqual([{ id: '1', name: 'Test Event' }]);
    });

    it('should return cached events if available', async () => {
      const cachedEvents = [{ id: '1', name: 'Cached Event' }];
      myCacheMock.get.mockReturnValue(cachedEvents);

      const events = await fetchEventsByLocation(
        55.6761,
        12.5683,
        10,
        '2025-01-01T00:00:00Z',
        '2025-01-01T23:59:59Z',
        'music'
      );

      expect(myCacheMock.get).toHaveBeenCalledWith(
        'events_55.6761_12.5683_10_2025-01-01T00:00:00Z_2025-01-01T23:59:59Z_music'
      );
      expect(axios.get).not.toHaveBeenCalled();
      expect(events).toEqual(cachedEvents);
    });

    it('should handle API errors gracefully', async () => {
      axios.get.mockRejectedValue(new Error('API fetch error'));

      await expect(
        fetchEventsByLocation(
          55.6761,
          12.5683,
          10,
          '2025-01-01T00:00:00Z',
          '2025-01-01T23:59:59Z',
          'music'
        )
      ).rejects.toThrow('Failed to fetch events');
      expect(myCacheMock.get).toHaveBeenCalledWith(
        'events_55.6761_12.5683_10_2025-01-01T00:00:00Z_2025-01-01T23:59:59Z_music'
      );
      expect(axios.get).toHaveBeenCalledWith('https://app.ticketmaster.com/discovery/v2/events.json', {
        params: {
          apikey: TICKETMASTER_API_KEY,
          latlong: '55.6761,12.5683',
          radius: 10,
          startDateTime: '2025-01-01T00:00:00Z',
          endDateTime: '2025-01-01T23:59:59Z',
          classificationName: 'music',
          sort: 'date,asc',
        },
      });
      expect(myCacheMock.set).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------------------
  // getEventById
  // ------------------------------------------------------------------------------
  describe('getEventById', () => {
    it('should fetch an event by ID and return formatted details', async () => {
      const mockData = {
        id: '1',
        name: 'Test Event',
        dates: { start: { localDate: '2025-01-01', localTime: '20:00:00' } },
        _embedded: {
          venues: [
            {
              name: 'Test Venue',
              address: { line1: 'Test Address' },
              city: { name: 'Test City' },
              postalCode: '12345',
              country: { name: 'Denmark' },
            },
          ],
        },
        images: [{ ratio: '16_9', url: 'test_image_url' }],
        url: 'test_event_url',
      };
      axios.get.mockResolvedValue({ data: mockData, status: 200 });

      const req = { params: { eventId: '1' } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getEventById(req, res);

      expect(axios.get).toHaveBeenCalledWith('https://app.ticketmaster.com/discovery/v2/events/1.json', {
        params: { apikey: TICKETMASTER_API_KEY },
      });
      expect(res.json).toHaveBeenCalledWith({
        id: '1',
        name: 'Test Event',
        date: '2025-01-01',
        time: '20:00:00',
        venue: 'Test Venue',
        venueAddress: {
          address: 'Test Address',
          city: 'Test City',
          postalCode: '12345',
          country: 'Denmark',
        },
        imageUrl: 'test_image_url',
        eventUrl: 'test_event_url',
      });
    });

    it('should return 500 if fetching event details fails', async () => {
      axios.get.mockRejectedValue(new Error('API fetch error'));

      const req = { params: { eventId: '1' } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getEventById(req, res);

      expect(axios.get).toHaveBeenCalledWith('https://app.ticketmaster.com/discovery/v2/events/1.json', {
        params: { apikey: TICKETMASTER_API_KEY },
      });
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to fetch event details',
        error: 'API fetch error',
      });
    });

    it('should handle non-200 status codes gracefully', async () => {
      axios.get.mockResolvedValue({ data: {}, status: 404 });

      const req = { params: { eventId: 'nonexistent' } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getEventById(req, res);

      expect(axios.get).toHaveBeenCalledWith('https://app.ticketmaster.com/discovery/v2/events/nonexistent.json', {
        params: { apikey: TICKETMASTER_API_KEY },
      });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'API call failed with status: 404',
      });
    });
  });

  // ------------------------------------------------------------------------------
  // getCoordinatesFromAddress
  // ------------------------------------------------------------------------------
  describe('getCoordinatesFromAddress', () => {
    it('should return coordinates for a valid address', async () => {
      const mockData = {
        results: [
          {
            geometry: {
              location: { lat: 55.6761, lng: 12.5683 },
            },
          },
        ],
      };
      axios.get.mockResolvedValue({ data: mockData });

      const coordinates = await getCoordinatesFromAddress('Copenhagen');

      expect(axios.get).toHaveBeenCalledWith('https://maps.googleapis.com/maps/api/geocode/json', {
        params: { address: 'Copenhagen', key: GEOCODING_API_KEY },
      });
      expect(coordinates).toEqual({ lat: 55.6761, lng: 12.5683 });
    });

    it('should throw an error for an invalid address', async () => {
      const mockData = { results: [] };
      axios.get.mockResolvedValue({ data: mockData });

      await expect(getCoordinatesFromAddress('Invalid Address')).rejects.toThrow('Address not found');
      expect(axios.get).toHaveBeenCalledWith('https://maps.googleapis.com/maps/api/geocode/json', {
        params: { address: 'Invalid Address', key: GEOCODING_API_KEY },
      });
    });

    it('should handle API errors gracefully', async () => {
      axios.get.mockRejectedValue(new Error('API fetch error'));

      await expect(getCoordinatesFromAddress('Copenhagen')).rejects.toThrow('Address not found');
      expect(axios.get).toHaveBeenCalledWith('https://maps.googleapis.com/maps/api/geocode/json', {
        params: { address: 'Copenhagen', key: GEOCODING_API_KEY },
      });
    });
  });

  // ------------------------------------------------------------------------------
  // getEventsKeyword
  // ------------------------------------------------------------------------------
  describe('getEventsKeyword', () => {
    it('should fetch events based on keyword and countryCode', async () => {
      const mockEvents = [{ id: '1', name: 'Keyword Event' }];
      axios.get.mockResolvedValue({ data: { _embedded: { events: mockEvents } } });

      const req = { query: { keyword: 'music', countryCode: 'DK' } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getEventsKeyword(req, res);

      expect(axios.get).toHaveBeenCalledWith('https://app.ticketmaster.com/discovery/v2/events.json', {
        params: { apikey: TICKETMASTER_API_KEY, keyword: 'music', countryCode: 'DK' },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockEvents);
    });

    it('should return 404 if no events are found for the given keyword', async () => {
      axios.get.mockResolvedValue({ data: { _embedded: { events: [] } } });

      const req = { query: { keyword: 'unknown' } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getEventsKeyword(req, res);

      expect(axios.get).toHaveBeenCalledWith('https://app.ticketmaster.com/discovery/v2/events.json', {
        params: { apikey: TICKETMASTER_API_KEY, keyword: 'unknown' },
      });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'No events found for the given keyword.',
      });
    });

    it('should return 400 if keyword is missing', async () => {
      const req = { query: {} };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getEventsKeyword(req, res);

      expect(axios.get).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Keyword parameter is required',
      });
    });

    it('should handle API errors gracefully', async () => {
      axios.get.mockRejectedValue(new Error('API fetch error'));

      const req = { query: { keyword: 'music' } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getEventsKeyword(req, res);

      expect(axios.get).toHaveBeenCalledWith('https://app.ticketmaster.com/discovery/v2/events.json', {
        params: { apikey: TICKETMASTER_API_KEY, keyword: 'music' },
      });
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to fetch events',
        error: 'API fetch error',
      });
    });
  });

  // ------------------------------------------------------------------------------
  // getEvents
  // ------------------------------------------------------------------------------
  describe('getEvents', () => {
    it('should fetch events based on query parameters without categories', async () => {
      const mockEvents = [{ id: '1', name: 'Event 1' }];
      fetchEventsByLocation.mockResolvedValue(mockEvents);

      const req = {
        query: {
          latitude: '55.6761',
          longitude: '12.5683',
          eventDate: 'sameDay',
          radius: '10',
        },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getEvents(req, res);

      expect(fetchEventsByLocation).toHaveBeenCalledWith(
        55.6761,
        12.5683,
        10,
        expect.any(String),
        expect.any(String),
        undefined
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockEvents);
    });

    it('should fetch events based on query parameters with categories', async () => {
      const mockEvents = [{ id: '1', name: 'Categorized Event' }];
      fetchEventsByCategories.mockResolvedValue(mockEvents);

      const req = {
        query: {
          latitude: '55.6761',
          longitude: '12.5683',
          eventDate: 'upcoming',
          categories: 'music,sports',
          radius: '15',
        },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getEvents(req, res);

      expect(fetchEventsByCategories).toHaveBeenCalledWith(
        '55.6761',
        '12.5683',
        15,
        expect.any(String),
        expect.any(String),
        ['music', 'sports']
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockEvents);
    });

    it('should return 400 for invalid date format', async () => {
      const req = {
        query: {
          latitude: '55.6761',
          longitude: '12.5683',
          eventDate: 'invalid-date',
          radius: '10',
        },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getEvents(req, res);

      expect(fetchEventsByLocation).not.toHaveBeenCalled();
      expect(fetchEventsByCategories).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid date format' });
    });

    it('should handle errors gracefully', async () => {
      fetchEventsByLocation.mockRejectedValue(new Error('Fetch error'));

      const req = {
        query: {
          latitude: '55.6761',
          longitude: '12.5683',
          eventDate: 'sameDay',
          radius: '10',
        },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getEvents(req, res);

      expect(fetchEventsByLocation).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Failed to fetch events' });
    });
  });

  // ------------------------------------------------------------------------------
  // fetchEventsByKeyword
  // ------------------------------------------------------------------------------
  describe('fetchEventsByKeyword', () => {
    it('should fetch events by keyword successfully', async () => {
      const mockEvents = [{ id: '1', name: 'Keyword Event' }];
      axios.get.mockResolvedValue({ data: { _embedded: { events: mockEvents } } });

      const req = {
        query: {
          keyword: 'music',
        },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await fetchEventsByKeyword(req, res);

      expect(axios.get).toHaveBeenCalledWith('https://app.ticketmaster.com/discovery/v2/events.json', {
        params: { apikey: TICKETMASTER_API_KEY, keyword: 'music' },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockEvents);
    });

    it('should handle missing keyword parameter', async () => {
      const req = { query: {} };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await fetchEventsByKeyword(req, res);

      expect(axios.get).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Keyword parameter is required',
      });
    });

    it('should handle no events found for keyword', async () => {
      axios.get.mockResolvedValue({ data: { _embedded: { events: [] } } });

      const req = {
        query: {
          keyword: 'unknown',
        },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await fetchEventsByKeyword(req, res);

      expect(axios.get).toHaveBeenCalledWith('https://app.ticketmaster.com/discovery/v2/events.json', {
        params: { apikey: TICKETMASTER_API_KEY, keyword: 'unknown' },
      });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'No events found for the given keyword.',
      });
    });

    it('should handle API errors gracefully', async () => {
      axios.get.mockRejectedValue(new Error('API fetch error'));

      const req = {
        query: {
          keyword: 'music',
        },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await fetchEventsByKeyword(req, res);

      expect(axios.get).toHaveBeenCalledWith('https://app.ticketmaster.com/discovery/v2/events.json', {
        params: { apikey: TICKETMASTER_API_KEY, keyword: 'music' },
      });
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to fetch events',
        error: 'API fetch error',
      });
    });
  });

  // ------------------------------------------------------------------------------
  // fetchEventsByCategory
  // ------------------------------------------------------------------------------
  describe('fetchEventsByCategory', () => {
    it('should fetch events by category successfully', async () => {
      const mockEvents = [{ id: '1', name: 'Category Event' }];
      axios.get.mockResolvedValue({ data: { _embedded: { events: mockEvents } }, status: 200 });

      const req = { 
        query: {
          category: 'music',
        }
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      // Mock getSubCategories
      const mockSubCategories = 'music,rock,pop';
      const getSubCategoriesMock = jest.spyOn(require('../controllers/EventController'), 'getSubCategories').mockResolvedValue(mockSubCategories);

      const userLatitude = 55.6761;
      const userLongitude = 12.5683;
      const radius = 10;
      const startDateTime = '2025-01-01T00:00:00Z';
      const endDateTime = '2025-01-01T23:59:59Z';
      const mainCategory = 'music';

      await fetchEventsByCategory(userLatitude, userLongitude, radius, startDateTime, endDateTime, mainCategory);

      expect(getSubCategoriesMock).toHaveBeenCalledWith(mainCategory);
      expect(axios.get).toHaveBeenCalledWith('https://app.ticketmaster.com/discovery/v2/events.json', {
        params: {
          apikey: TICKETMASTER_API_KEY,
          latlong: '55.6761,12.5683',
          radius: 10,
          startDateTime: '2025-01-01T00:00:00Z',
          endDateTime: '2025-01-01T23:59:59Z',
          classifications: 'music,rock,pop',
        },
      });
      expect(mockEvents).toEqual(mockEvents);
    });

    it('should handle errors gracefully', async () => {
      axios.get.mockRejectedValue(new Error('API fetch error'));

      const userLatitude = 55.6761;
      const userLongitude = 12.5683;
      const radius = 10;
      const startDateTime = '2025-01-01T00:00:00Z';
      const endDateTime = '2025-01-01T23:59:59Z';
      const mainCategory = 'music';

      await expect(
        fetchEventsByCategory(userLatitude, userLongitude, radius, startDateTime, endDateTime, mainCategory)
      ).rejects.toThrow('Error fetching events from Ticketmaster');
      
      expect(axios.get).toHaveBeenCalledWith('https://app.ticketmaster.com/discovery/v2/events.json', {
        params: {
          apikey: TICKETMASTER_API_KEY,
          latlong: '55.6761,12.5683',
          radius: 10,
          startDateTime: '2025-01-01T00:00:00Z',
          endDateTime: '2025-01-01T23:59:59Z',
          classifications: 'music,rock,pop',
        },
      });
    });
  });

  // ------------------------------------------------------------------------------
  // fetchEventsByCategories
  // ------------------------------------------------------------------------------
  describe('fetchEventsByCategories', () => {
    it('should fetch events by multiple categories successfully', async () => {
      const mockEvents = [{ id: '1', name: 'Multi-Category Event' }];
      axios.get.mockResolvedValue({ data: { _embedded: { events: mockEvents } }, status: 200 });

      const userLatitude = 55.6761;
      const userLongitude = 12.5683;
      const radius = 10;
      const startDateTime = '2025-01-01T00:00:00Z';
      const endDateTime = '2025-01-01T23:59:59Z';
      const mainCategories = ['music', 'sports'];

      // Mock getSubCategoriesForSegment
      const getSubCategoriesForSegmentMock = jest.spyOn(require('../controllers/EventController'), 'getSubCategoriesForSegment').mockResolvedValueOnce('music,rock,pop').mockResolvedValueOnce('sports,football,basketball');

      const events = await fetchEventsByCategories(
        userLatitude,
        userLongitude,
        radius,
        startDateTime,
        endDateTime,
        mainCategories
      );

      expect(getSubCategoriesForSegmentMock).toHaveBeenCalledTimes(2);
      expect(getSubCategoriesForSegmentMock).toHaveBeenNthCalledWith(1, 'music');
      expect(getSubCategoriesForSegmentMock).toHaveBeenNthCalledWith(2, 'sports');

      expect(axios.get).toHaveBeenCalledWith('https://app.ticketmaster.com/discovery/v2/events.json', {
        params: {
          apikey: TICKETMASTER_API_KEY,
          latlong: '55.6761,12.5683',
          radius: 10,
          startDateTime: '2025-01-01T00:00:00Z',
          endDateTime: '2025-01-01T23:59:59Z',
          classificationId: 'music,rock,pop,sports,football,basketball',
          sort: 'date,asc',
        },
      });

      expect(events).toEqual(mockEvents);
    });

    it('should handle empty classification IDs gracefully', async () => {
      const mockEvents = [];
      axios.get.mockResolvedValue({ data: { _embedded: { events: mockEvents } }, status: 200 });

      const userLatitude = 55.6761;
      const userLongitude = 12.5683;
      const radius = 10;
      const startDateTime = '2025-01-01T00:00:00Z';
      const endDateTime = '2025-01-01T23:59:59Z';
      const mainCategories = ['unknown'];

      // Mock getSubCategoriesForSegment to return empty string
      const getSubCategoriesForSegmentMock = jest.spyOn(require('../controllers/EventController'), 'getSubCategoriesForSegment').mockResolvedValue('');

      const events = await fetchEventsByCategories(
        userLatitude,
        userLongitude,
        radius,
        startDateTime,
        endDateTime,
        mainCategories
      );

      expect(getSubCategoriesForSegmentMock).toHaveBeenCalledWith('unknown');
      expect(axios.get).toHaveBeenCalledWith('https://app.ticketmaster.com/discovery/v2/events.json', {
        params: {
          apikey: TICKETMASTER_API_KEY,
          latlong: '55.6761,12.5683',
          radius: 10,
          startDateTime: '2025-01-01T00:00:00Z',
          endDateTime: '2025-01-01T23:59:59Z',
          classificationId: '',
          sort: 'date,asc',
        },
      });

      expect(events).toEqual(mockEvents);
    });

    it('should handle API errors gracefully', async () => {
      axios.get.mockRejectedValue(new Error('API fetch error'));

      const userLatitude = 55.6761;
      const userLongitude = 12.5683;
      const radius = 10;
      const startDateTime = '2025-01-01T00:00:00Z';
      const endDateTime = '2025-01-01T23:59:59Z';
      const mainCategories = ['music'];

      // Mock getSubCategoriesForSegment
      const getSubCategoriesForSegmentMock = jest.spyOn(require('../controllers/EventController'), 'getSubCategoriesForSegment').mockResolvedValue('music,rock,pop');

      await expect(
        fetchEventsByCategories(userLatitude, userLongitude, radius, startDateTime, endDateTime, mainCategories)
      ).rejects.toThrow('Error fetching events from Ticketmaster');

      expect(getSubCategoriesForSegmentMock).toHaveBeenCalledWith('music');
      expect(axios.get).toHaveBeenCalledWith('https://app.ticketmaster.com/discovery/v2/events.json', {
        params: {
          apikey: TICKETMASTER_API_KEY,
          latlong: '55.6761,12.5683',
          radius: 10,
          startDateTime: '2025-01-01T00:00:00Z',
          endDateTime: '2025-01-01T23:59:59Z',
          classificationId: 'music,rock,pop',
          sort: 'date,asc',
        },
      });
    });
  });
});
