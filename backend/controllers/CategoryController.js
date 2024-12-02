// controllers/CategoryController.js

require('dotenv').config();
const axios = require('axios');

let cachedCategories = null;

const CategoryController = {
  // Function to reset the cache (for testing purposes)
  resetCache: function () {
    cachedCategories = null;
  },

  // Function to fetch categories
  fetchCategories: async function () {
    if (cachedCategories) return cachedCategories; // Return cached categories if they exist
    try {
      const apiKey = process.env.TICKETMASTER_API_KEY;
      const apiUrl = 'https://app.ticketmaster.com/discovery/v2/classifications.json';
      const params = {
        apikey: apiKey,
      };

      const response = await axios.get(apiUrl, { params });

      // Filter only the top-level categories
      const topCategories = response.data._embedded.classifications.filter(
        (classification) => !classification.subClassifications
      );
      cachedCategories = topCategories; // Cache the results

      return topCategories;
    } catch (error) {
      console.error(
        'Error fetching categories from Ticketmaster:',
        error.response?.data || error.message
      );
      throw new Error('Error fetching categories from Ticketmaster');
    }
  },

  // Controller function to get categories
  getCategories: async function (req, res) {
    try {
      const categories = await this.fetchCategories();
      res.json(categories);
    } catch (error) {
      console.error('Error:', error);
      if (error.message.includes('API error')) {
        res.status(500).json({ message: 'Ticketmaster API error' });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  },
};


module.exports = CategoryController;
