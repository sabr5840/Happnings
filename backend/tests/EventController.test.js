// Importing the necessary modules and functions
const axios = require('axios');
const NodeCache = require('node-cache');
const { fetchSameDayEvents, fetchUpcomingEvents, fetchEventsByLocation } = require('../controllers/EventController');

// Mocking external dependencies
jest.mock('axios');
jest.mock('node-cache'); // Assuming that your actual implementation uses NodeCache directly

// Mocking internal functions that make external calls
jest.mock('./EventController', () => ({
  ...jest.requireActual('./EventController'),
  fetchEventsByLocation: jest.fn()
}));

describe('EventController', () => {
  // Setup common variables if needed
  const mockLatitude = 55.6761;
  const mockLongitude = 12.5683;

  describe('fetchSameDayEvents', () => {
    it('should fetch events for the same day', async () => {
      const currentDate = new Date();
      const startDate = new Date(currentDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(currentDate);
      endDate.setHours(23, 59, 59, 0);

      await fetchSameDayEvents(mockLatitude, mockLongitude);

      expect(fetchEventsByLocation).toHaveBeenCalledWith(
        mockLatitude,
        mockLongitude,
        24.85,  // Radius assumed to be 24.85 miles as per your setup
        startDate.toISOString().slice(0, -5) + "Z",
        endDate.toISOString().slice(0, -5) + "Z"
      );
    });
  });

  describe('fetchUpcomingEvents', () => {
    it('should fetch events for the upcoming week', async () => {
      const currentDate = new Date();
      const startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() + 1);  // From tomorrow
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);  // Up to 7 days ahead

      await fetchUpcomingEvents(mockLatitude, mockLongitude);

      expect(fetchEventsByLocation).toHaveBeenCalledWith(
        mockLatitude,
        mockLongitude,
        24.85,  // Radius assumed to be 24.85 miles as per your setup
        startDate.toISOString().slice(0, -5) + "Z",
        endDate.toISOString().slice(0, -5) + "Z"
      );
    });
  });
});

