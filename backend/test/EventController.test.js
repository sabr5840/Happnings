// test/EventController.test.js
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const {
  fetchEventsByLocation,
  fetchSameDayEvents,
  fetchUpcomingEvents,
  getEventById,
  getEvents,
  getCoordinatesFromAddress,
  fetchEventsByCategory,
  getSubCategories,
} = require('../controllers/EventController.js');

// Initialize mock for axios
const mock = new MockAdapter(axios);

beforeEach(() => {
  // Mock Ticketmaster API response
  mock.onGet(/https:\/\/app\.ticketmaster\.com\/discovery\/v2\/events\.json/).reply(200, {
    _embedded: {
      events: [
        { id: '1', name: 'Sample Event 1' },
        { id: '2', name: 'Sample Event 2' },
      ],
    },
  });

  // Mock Google Geocoding API response
  mock.onGet(/https:\/\/maps\.googleapis\.com\/maps\/api\/geocode\/json/).reply(200, {
    results: [
      {
        geometry: {
          location: {
            lat: 55.6761,
            lng: 12.5683,
          },
        },
      },
    ],
  });
});

afterEach(() => {
  mock.reset();
});

describe('EventController Tests', () => {
  describe('fetchEventsByLocation', () => {
    it('should fetch events based on location', async () => {
      const userLatitude = 55.6761;
      const userLongitude = 12.5683;
      const radius = 10;
      const startDateTime = '2023-01-01T00:00:00Z';
      const endDateTime = '2023-01-07T23:59:59Z';
      const category = 'music';

      const events = await fetchEventsByLocation(userLatitude, userLongitude, radius, startDateTime, endDateTime, category);
      expect(events).toHaveLength(2);
      expect(events[0].name).toBe('Sample Event 1');
    });

    it('should throw an error if radius exceeds maximum', async () => {
      await expect(fetchEventsByLocation(55.6761, 12.5683, 20000, '', '', '')).rejects.toThrow('Radius cannot exceed 19,999 miles');
    });
  });

  describe('fetchSameDayEvents', () => {
    it('should fetch events for the same day', async () => {
      const userLatitude = 55.6761;
      const userLongitude = 12.5683;

      const events = await fetchSameDayEvents(userLatitude, userLongitude);
      expect(events).toHaveLength(2);
      expect(events[0].name).toBe('Sample Event 1');
    });
  });

  describe('fetchUpcomingEvents', () => {
    it('should fetch upcoming events', async () => {
      const userLatitude = 55.6761;
      const userLongitude = 12.5683;

      const events = await fetchUpcomingEvents(userLatitude, userLongitude);
      expect(events).toHaveLength(2);
      expect(events[0].name).toBe('Sample Event 1');
    });
  });

  describe('getEventById', () => {
    it('should get event by ID', async () => {
      const req = { params: { eventId: '123' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      mock.onGet(/https:\/\/app\.ticketmaster\.com\/discovery\/v2\/events\/123\.json/).reply(200, {
        id: '123',
        name: 'Event Name',
        dates: { start: { localDate: '2023-01-01', localTime: '20:00:00' } },
        images: [{ ratio: '16_9', url: 'http://image.url', width: 640, height: 360 }],
        classifications: [{ genre: { name: 'Rock' } }],
        _embedded: {
          venues: [
            {
              name: 'Venue Name',
              address: { line1: 'Address Line 1' },
              postalCode: '1234',
              city: { name: 'City Name' },
              country: { name: 'Country Name' },
            },
          ],
        },
        url: 'http://event.url',
      });

      await getEventById(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        id: '123',
        name: 'Event Name',
        venue: 'Venue Name',
      }));
    });
  });

  describe('getEvents', () => {
    it('should get events based on query parameters', async () => {
      const req = {
        query: {
          latitude: '55.6761',
          longitude: '12.5683',
          eventDate: 'sameDay',
        },
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await getEvents(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ name: 'Sample Event 1' }),
      ]));
    });

    it('should get events based on location search', async () => {
      const req = {
        query: {
          location: 'Copenhagen',
          eventDate: 'upcoming',
        },
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await getEvents(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ name: 'Sample Event 1' }),
      ]));
    });
  });

  describe('getCoordinatesFromAddress', () => {
    it('should get coordinates from address', async () => {
      const address = 'Copenhagen';

      const coordinates = await getCoordinatesFromAddress(address);

      expect(coordinates).toEqual({ lat: 55.6761, lng: 12.5683 });
    });

    it('should throw an error if address not found', async () => {
      mock.onGet(/https:\/\/maps\.googleapis\.com\/maps\/api\/geocode\/json/).reply(200, { results: [] });

      await expect(getCoordinatesFromAddress('Unknown Place')).rejects.toThrow('Address not found');
    });
  });

  describe('fetchEventsByCategory', () => {
    it('should fetch events based on category', async () => {
      const userLatitude = 55.6761;
      const userLongitude = 12.5683;
      const radius = 10;
      const startDateTime = '2023-01-01T00:00:00Z';
      const endDateTime = '2023-01-07T23:59:59Z';
      const mainCategory = 'music';

      jest.spyOn(require('../controllers/EventController.js'), 'getSubCategories').mockResolvedValue('music,rock,pop');

      const events = await fetchEventsByCategory(userLatitude, userLongitude, radius, startDateTime, endDateTime, mainCategory);

      expect(events).toHaveLength(2);
      expect(events[0].name).toBe('Sample Event 1');
    });
  });
});
