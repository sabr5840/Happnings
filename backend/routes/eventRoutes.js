const express = require('express');
const router = express.Router();
const { 
  getEvents,
  getEventsKeyword,
  getEventById,
  getCoordinatesFromAddress,
  fetchEventsByLocation
} = require('../controllers/EventController.js');  // Import event-related handling functions from EventController

// Define a route that fetches events based on a physical address
router.get('/by-address', async (req, res) => {
  try {
    const { address } = req.query; // Extract address from query parameters
    if (!address) {

      // If address is not provided, return an error
      return res.status(400).json({ message: 'Address is required' });
    }

    // Convert the address into geographic coordinates
    const { lat, lng } = await getCoordinatesFromAddress(address);

    // Fetch events based on the latitude, longitude, and a specific time range
    const events = await fetchEventsByLocation(lat, lng, 24, '2024-12-31T23:59:59Z', '2024-12-01T00:00:00Z'); // Justere disse parametre efter behov
    res.json(events);// Send the fetched events as a response
  } catch (error) {

    // Log and respond with errors encountered during the operation
    console.error('Error fetching events by address:', error);
    res.status(500).json({ message: 'Failed to fetch events', error: error.message });
  }
});

// Define a route for fetching events based on a search keyword
router.get('/keyword', getEventsKeyword); // Delegates the request to the getEventsKeyword function

// Define a general route for fetching events based on location, date, and category parameters
router.get('/', getEvents); // This could be the primary route for fetching events as it handles potentially complex queries

// Define a route to fetch specific event details using an event ID
// This route handles fetching detailed information about a single event
router.get('/:eventId', getEventById);

module.exports = router;
