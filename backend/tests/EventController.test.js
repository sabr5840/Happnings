// backend/tests/EventController.test.js

require('dotenv').config();
const axios = require('axios');
const NodeCache = require('node-cache');
const {
  fetchEventsByLocation,
  getEventById,
  getCoordinatesFromAddress,
} = require('../controllers/EventController');

// Mock dependencies
jest.mock('axios');
jest.mock('node-cache');

// Opret en mock for NodeCache
const myCacheMock = {
  get: jest.fn(),
  set: jest.fn(),
};

// Sørg for, at enhver ny instans af NodeCache returnerer myCacheMock
NodeCache.mockImplementation(() => myCacheMock);

describe('EventController', () => {
  const TICKETMASTER_API_KEY = 'test_api_key';
  const GEOCODING_API_KEY = 'test_geocoding_key';

  beforeAll(() => {
    process.env.TICKETMASTER_API_KEY = TICKETMASTER_API_KEY;
    process.env.API_KEY_GEOCODING = GEOCODING_API_KEY;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchEventsByLocation', () => {
    it('should fetch events and cache them', async () => {
      // Simuler en tom cache
      myCacheMock.get.mockReturnValueOnce(undefined);

      // Mock API-respons
      const mockData = { _embedded: { events: [{ id: '1', name: 'Test Event' }] } };
      axios.get.mockResolvedValue({ data: mockData });

      const events = await fetchEventsByLocation(
        55.6761,
        12.5683,
        10,
        '2025-01-01T00:00:00Z',
        '2025-01-01T23:59:59Z',
        'music'
      );

      expect(myCacheMock.get).toHaveBeenCalled();
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
      // Simuler cached data
      const cachedEvents = [{ id: '1', name: 'Cached Event' }];
      myCacheMock.get.mockReturnValueOnce(cachedEvents);

      const events = await fetchEventsByLocation(
        55.6761,
        12.5683,
        10,
        '2025-01-01T00:00:00Z',
        '2025-01-01T23:59:59Z',
        'music'
      );

      expect(myCacheMock.get).toHaveBeenCalled();
      expect(axios.get).not.toHaveBeenCalled();
      expect(events).toEqual(cachedEvents);
    });
  });

  describe('getEventById', () => {
    it('should fetch an event by ID and return formatted details', async () => {
      // Mock API-respons med status 200
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
      axios.get.mockResolvedValue({ status: 200, data: mockData });

      // Mock Express request og response
      const req = { params: { eventId: '1' } };
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

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

    it('should handle API call failure with non-200 status', async () => {
      // Mock API-respons med status 500
      axios.get.mockResolvedValue({ status: 500, data: {} });

      // Mock Express request og response
      const req = { params: { eventId: '1' } };
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

      await getEventById(req, res);

      expect(axios.get).toHaveBeenCalledWith('https://app.ticketmaster.com/discovery/v2/events/1.json', {
        params: { apikey: TICKETMASTER_API_KEY },
      });
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'API call failed with status: 500' });
    });

    it('should handle axios errors properly', async () => {
      // Mock axios til at kaste en fejl
      axios.get.mockRejectedValue(new Error('Network Error'));

      // Mock Express request og response
      const req = { params: { eventId: '1' } };
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

      await getEventById(req, res);

      expect(axios.get).toHaveBeenCalledWith('https://app.ticketmaster.com/discovery/v2/events/1.json', {
        params: { apikey: TICKETMASTER_API_KEY },
      });
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to fetch event details',
        error: 'Network Error',
      });
    });
  });

  describe('getCoordinatesFromAddress', () => {
    it('should return coordinates for a valid address', async () => {
      // Mock API-respons
      const mockData = { results: [{ geometry: { location: { lat: 55.6761, lng: 12.5683 } } }] };
      axios.get.mockResolvedValue({ data: mockData });

      const coordinates = await getCoordinatesFromAddress('Copenhagen');

      expect(axios.get).toHaveBeenCalledWith('https://maps.googleapis.com/maps/api/geocode/json', {
        params: { address: 'Copenhagen', key: GEOCODING_API_KEY },
      });
      expect(coordinates).toEqual({ lat: 55.6761, lng: 12.5683 });
    });

    it('should throw an error for an invalid address', async () => {
      // Mock API-respons med ingen resultater
      axios.get.mockResolvedValue({ data: { results: [] } });

      await expect(getCoordinatesFromAddress('Invalid Address')).rejects.toThrow('Address not found');
      expect(axios.get).toHaveBeenCalledWith('https://maps.googleapis.com/maps/api/geocode/json', {
        params: { address: 'Invalid Address', key: GEOCODING_API_KEY },
      });
    });

    it('should handle axios errors properly', async () => {
      // Mock axios til at kaste en fejl
      axios.get.mockRejectedValue(new Error('Network Error'));

      await expect(getCoordinatesFromAddress('Copenhagen')).rejects.toThrow('Address not found');
      expect(axios.get).toHaveBeenCalledWith('https://maps.googleapis.com/maps/api/geocode/json', {
        params: { address: 'Copenhagen', key: GEOCODING_API_KEY },
      });
    });
  });
});
