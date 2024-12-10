const express = require('express');
const router = express.Router();
const { getEvents } = require('../controllers/EventController.js');

// Route to fetch events based on location, date, and category
router.get('/', getEvents);

module.exports = router;
