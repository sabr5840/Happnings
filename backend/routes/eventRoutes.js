const express = require('express');
const router = express.Router();
const { 
  getEvents,
  getEventsKeyword,
  getEventById 
} = require('../controllers/EventController.js');  // Sørg for, at getEventsKeyword er her

// Route til at hente events baseret på keyword
router.get('/keyword', getEventsKeyword); // Håndterer søgning baseret på keyword

// Rute til at hente events baseret på location, dato og kategorier
router.get('/', getEvents); // Hvis du stadig vil have den eksisterende rute for location og kategorier

// Route til at hente specifik event baseret på eventId
router.get('/:eventId', getEventById);

module.exports = router;
