// EventController.test.js
const axios = require('axios');
const NodeCache = require('node-cache');
const axiosMock = new (require('axios-mock-adapter'))(axios);
const {
  fetchEventsByLocation,
  fetchSameDayEvents,
  fetchEventsByKeyword,
  fetchUpcomingEvents,
  getEventById,
  getCoordinatesFromAddress,
  fetchEventsByCategory,
  fetchEventsByCategories,
  getEvents,
  getEventsKeyword
} = require('./EventController');  // Adjust the path as needed

// Mock the cache
const myCache = new NodeCache();
jest.mock('node-cache', () => jest.fn().mockImplementation(() => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn()
})));

describe('EventController', () => {
  afterEach(() => {
    axiosMock.reset();
    jest.clearAllMocks();
  });

  describe('fetchEventsByLocation', () => {
    test('should fetch events from API and cache them', async () => {
      const events = [{ id: 1, name: 'Concert' }];
      axiosMock.onGet('https://app.ticketmaster.com/discovery/v2/events.json').reply(200, {
        _embedded: { events }
      });
      const result = await fetchEventsByLocation('35.6895', '139.6917', 10, '2021-01-01T00:00:00Z', '2021-01-02T00:00:00Z', 'Music');
      expect(result).toEqual(events);
      expect(myCache.set).toHaveBeenCalledWith(expect.any(String), events, 100);
    });
  });

  describe('fetchSameDayEvents', () => {
    test('should fetch events for the current day', async () => {
      const events = [{ id: 2, name: 'Festival' }];
      axiosMock.onGet('https://app.ticketmaster.com/discovery/v2/events.json').reply(200, {
        _embedded: { events }
      });
      const result = await fetchSameDayEvents('35.6895', '139.6917');
      expect(result).toEqual(events);
    });
  });

  describe('fetchEventsByKeyword', () => {
    test('should fetch events based on a keyword', async () => {
      const events = [{ id: 3, name: 'Play' }];
      axiosMock.onGet('https://app.ticketmaster.com/discovery/v2/events.json').reply(200, {
        _embedded: { events }
      });
      const result = await fetchEventsByKeyword('drama', '35.6895', '139.6917', 10, '2021-01-01T00:00:00Z', '2021-01-02T00:00:00Z');
      expect(result).toEqual(events);
    });
  });

  describe('fetchUpcomingEvents', () => {
    test('should fetch events for the next week', async () => {
      const events = [{ id: 4, name: 'Art Exhibit' }];
      axiosMock.onGet('https://app.ticketmaster.com/discovery/v2/events.json').reply(200, {
        _embedded: { events }
      });
      const result = await fetchUpcomingEvents('35.6895', '139.6917');
      expect(result).toEqual(events);
    });
  });

  describe('getEventById', () => {
    test('should fetch specific event by ID', async () => {
      const event = { id: 5, name: 'Opera' };
      axiosMock.onGet('https://app.ticketmaster.com/discovery/v2/events/5.json').reply(200, event);
      const result = await getEventById({ params: { eventId: '5' } }, { json: jest.fn(), status: jest.fn() });
      expect(result).toEqual(event);
    });
  });

  describe('getCoordinatesFromAddress', () => {
    test('should fetch coordinates for a given address', async () => {
      const data = { results: [{ geometry: { location: { lat: 34.0522, lng: -118.2437 } } }], status: 'OK' };
      axiosMock.onGet('https://maps.googleapis.com/maps/api/geocode/json').reply(200, data);
      const result = await getCoordinatesFromAddress('Los Angeles, CA');
      expect(result).toEqual({ lat: 34.0522, lng: -118.2437 });
    });
  });

  describe('fetchEventsByCategory', () => {
    test('should fetch events by category', async () => {
      const events = [{ id: 6, name: 'Comedy Show' }];
      axiosMock.onGet('https://app.ticketmaster.com/discovery/v2/events.json').reply(200, {
        _embedded: { events }
      });
      const result = await fetchEventsByCategory('35.6895', '139.6917', 10, '2021-01-01T00:00:00Z', '2021-01-02T00:00:00Z', 'Comedy');
      expect(result).toEqual(events);
    });
  });

  describe('fetchEventsByCategories', () => {
    test('should fetch events by multiple categories', async () => {
      const events = [{ id: 7, name: 'Music Festival' }];
      axiosMock.onGet('https://app.ticketmaster.com/discovery/v2/events.json').reply(200, {
        _embedded: { events }
      });
      const result = await fetchEventsByCategories('35.6895', '139.6917', 10, '2021-01-01T00:00:00Z', '2021-01-02T00:00:00Z', ['Music', 'Live']);
      expect(result).toEqual(events);
    });
  });

  describe('getEvents', () => {
    test('should fetch events based on query parameters', async () => {
      const events = [{ id: 8, name: 'Theatre' }];
      axiosMock.onGet('https://app.ticketmaster.com/discovery/v2/events.json').reply(200, {
        _embedded: { events }
      });
      const req = {
        query: {
          latitude: '35.6895',
          longitude: '139.6917',
          eventDate: 'sameDay',
          categories: 'Theatre',
          radius: '10'
        }
      };
      const res = {
        json: jest.fn(),
        status: jest.fn(() => res)
      };
      await getEvents(req, res);
      expect(res.json).toHaveBeenCalledWith(events);
    });
  });

  describe('getEventsKeyword', () => {
    test('should fetch events by a specific keyword', async () => {
      const events = [{ id: 9, name: 'Book Reading' }];
      axiosMock.onGet('https://app.ticketmaster.com/discovery/v2/events.json').reply(200, {
        _embedded: { events }
      });
      const req = {
        query: {
          keyword: 'book',
          countryCode: 'US'
        }
      };
      const res = {
        json: jest.fn(),
        status: jest.fn(() => res)
      };
      await getEventsKeyword(req, res);
      expect(res.json).toHaveBeenCalledWith(events);
    });
  });
});
