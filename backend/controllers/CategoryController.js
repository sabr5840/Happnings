// Import necessary packages
require('dotenv').config();
const axios = require('axios');

// Initialize cache storage
let cachedCategories = null;
let cacheTimestamp = null;

// Define cache duration as 1 day in milliseconds
const CACHE_DURATION = 24 * 60 * 60 * 1000; 

// Asynchronous function to fetch categories from Ticketmaster API
const fetchCategories = async () => {
  const now = new Date().getTime();

  // Check if valid cache exists and if it is still within the duration
  if (cachedCategories && cacheTimestamp && now - cacheTimestamp < CACHE_DURATION) {
    console.log('Returning cached categories');
    return cachedCategories;
  }
  try {
    // Retrieve API key and define API endpoint
    const apiKey = process.env.TICKETMASTER_API_KEY;
    const apiUrl = 'https://app.ticketmaster.com/discovery/v2/classifications.json';
    const params = { apikey: apiKey };

    // Request data from API
    const response = await axios.get(apiUrl, { params });

    // Check and handle missing or invalid data in the API response
    if (!response.data._embedded || !response.data._embedded.classifications) {
      throw new Error('Invalid API response format');
    }

    // Filter and transform data to only include top-level categories
    const topCategories = response.data._embedded.classifications
      .filter((classification) => classification.segment && classification.segment.name) // enure valid data
      .map((classification) => ({
        id: classification.segment.id,
        name: classification.segment.name,
      }));


    // Update cache with new categories
    cachedCategories = topCategories;
    cacheTimestamp = now;
    console.log(`Fetched ${topCategories.length} top-level categories`);
    return topCategories;
  } catch (error) {

    // Handle errors in API request
    console.error('Error fetching categories from Ticketmaster:', error.response?.data || error.message);
    throw new Error('Error fetching categories from Ticketmaster');
  }
};


// Controller function to handle HTTP requests and respond with the categories
const getCategories = async (req, res) => {
  try {
    const categories = await fetchCategories();
    res.status(200).json(categories);
  } catch (error) {
    
    // Log and return error if issues occur while fetching categories
    console.error('Error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

// Export functionalities for use in other files
module.exports = {
  getCategories,
  resetCache: () => {
    cachedCategories = null;
    cacheTimestamp = null;
  },
};
