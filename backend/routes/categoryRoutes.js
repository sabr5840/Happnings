const express = require('express');
const { getCategories, getFilteredAndSortedEvents } = require('../controllers/CategoryController');
const router = express.Router();

// Route for getting all categories
router.get('/', getCategories);

// Route for getting events with filtering and sorting
router.get('/events', getFilteredAndSortedEvents);
router.get('/filter', getFilteredAndSortedEvents);


module.exports = router;
