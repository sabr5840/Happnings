const express = require('express');
const router = express.Router();
const { 
  getEvents,
  getEventsKeyword,
  getEventById,
  getCoordinatesFromAddress,
  fetchEventsByLocation
} = require('../controllers/EventController.js');  // Sørg for, at getEventsKeyword er her

router.get('/by-address', async (req, res) => {
  try {
    const { address } = req.query;
    if (!address) {
      return res.status(400).json({ message: 'Address is required' });
    }

    const { lat, lng } = await getCoordinatesFromAddress(address);
    const events = await fetchEventsByLocation(lat, lng, 24, '2024-12-31T23:59:59Z', '2024-12-01T00:00:00Z'); // Justere disse parametre efter behov
    res.json(events);
  } catch (error) {
    console.error('Error fetching events by address:', error);
    res.status(500).json({ message: 'Failed to fetch events', error: error.message });
  }
});

// Route til at hente events baseret på keyword
router.get('/keyword', getEventsKeyword); // Håndterer søgning baseret på keyword

// Rute til at hente events baseret på location, dato og kategorier
router.get('/', getEvents); // Hvis du stadig vil have den eksisterende rute for location og kategorier

// Route til at hente specifik event baseret på eventId
router.get('/:eventId', getEventById);

module.exports = router;
