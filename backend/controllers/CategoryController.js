require('dotenv').config();
const axios = require('axios');

let cachedCategories = null;
let cacheTimestamp = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 1 dag i millisekunder

// Hent kategorier fra Ticketmaster API
const fetchCategories = async () => {
  const now = new Date().getTime();
  if (cachedCategories && cacheTimestamp && now - cacheTimestamp < CACHE_DURATION) {
    console.log('Returning cached categories');
    return cachedCategories;
  }
  try {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    const apiUrl = 'https://app.ticketmaster.com/discovery/v2/classifications.json';
    const params = { apikey: apiKey };

    const response = await axios.get(apiUrl, { params });

    if (!response.data._embedded || !response.data._embedded.classifications) {
      throw new Error('Invalid API response format');
    }

    const topCategories = response.data._embedded.classifications.filter(
      (classification) => !classification.subClassifications
    );

    cachedCategories = topCategories;
    cacheTimestamp = now; // Opdater cache-timestamp
    console.log(`Fetched ${topCategories.length} top-level categories`);
    return topCategories;
  } catch (error) {
    console.error('Error fetching categories from Ticketmaster:', error.response?.data || error.message);
    throw new Error('Error fetching categories from Ticketmaster');
  }
};

// Controller til at hente kategorier
const getCategories = async (req, res) => {
  try {
    const categories = await fetchCategories();
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

module.exports = {
  getCategories,
  resetCache: () => {
    cachedCategories = null;
    cacheTimestamp = null;
  },
};
