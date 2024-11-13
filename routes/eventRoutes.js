const express = require('express');
const { getFilteredEvents } = require('../controllers/EventController');
const router = express.Router();

// Route to retrieve filtered events
router.get('/filter', getFilteredEvents);

module.exports = router;
