const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const db = require('../config/db.js');
const { addToFavorite } = require('../controllers/FavoriteController');

// Initialize `MockAdapter`
const mockAxios = new MockAdapter(axios);

// Mock Axios API Responses
mockAxios.onGet(/https:\/\/app\.ticketmaster\.com\/discovery\/v2\/events\/.+\.json/).reply(config => {
  const eventId = config.url.match(/events\/(.+)\.json/)[1];
  console.log(`Mocked API call for eventId: ${eventId}`);
  if (eventId === 'Z698xZC4Z174oGM') {
    return [
      200,
      {
        id: 'Z698xZC4Z174oGM',
        name: 'Sample Event',
        dates: { start: { localDate: '2023-01-01', localTime: '20:00:00' } },
        priceRanges: [{ min: 50 }],
        images: [{ url: 'http://image.url', width: 640, height: 360 }],
        classifications: [{ genre: { name: 'Rock' } }],
        _embedded: { venues: [{ name: 'Sample Venue', address: { line1: 'Sample Address' } }] },
        url: 'http://event.url',
      },
    ];
  } else if (eventId === 'invalidEventId') {
    return [404, { message: 'Event not found' }];
  }
  return [500, { message: 'Internal Server Error' }];
});

// Mock Database
jest.mock('../config/db.js', () => ({
  query: jest.fn(),
}));

describe('FavoriteController Tests', () => {
  afterEach(() => {
    mockAxios.reset();
    jest.clearAllMocks();
  });

  it('should add an event to favorites', async () => {
    const req = {
      session: { userId: 1 },
      body: { eventId: 'Z698xZC4Z174oGM' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    db.query.mockResolvedValueOnce([]); // No existing favorites
    db.query.mockResolvedValueOnce([{ insertId: 1 }]); // Insertion success

    await addToFavorite(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: 'Event added to favorite' });
  });

  it('should return 404 if event is not found', async () => {
    const req = {
      session: { userId: 1 },
      body: { eventId: 'invalidEventId' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await addToFavorite(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Event not found' });
  });

  it('should return 400 if event ID is missing', async () => {
    const req = {
      session: { userId: 1 },
      body: {},
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await addToFavorite(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Event ID is required' });
  });
});
