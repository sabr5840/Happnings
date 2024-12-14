const express = require('express');
const router = express.Router();
const { getEvents, getEventById } = require('../controllers/EventController.js');

// Route to fetch events based on location, date, and category
router.get('/', getEvents);
router.get('/:eventId', getEventById);


module.exports = router;
