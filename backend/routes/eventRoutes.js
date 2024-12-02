const express = require('express');
const router = express.Router();
const { getEvents, getEventById, fetchEventsByCategory } = require('../controllers/EventController.js');

// Route to fetch events based on location, date, and category
router.get('/events', getEvents);

// Route to fetch a specific event by its ID
router.get('/events/:eventId', getEventById);

// Route to fetch events by category
router.get('/events/category', fetchEventsByCategory);

module.exports = router;
