require('dotenv').config(); 
const axios = require('axios');

let cachedCategories = null;


// Function to fetch categories
const fetchCategories = async () => {
  if (cachedCategories) return cachedCategories;  // Return cached categories if they exist
  try {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    const apiUrl = 'https://app.ticketmaster.com/discovery/v2/classifications.json';
    const params = {
      apikey: apiKey,
    };

    const response = await axios.get(apiUrl, { params });

    // Filter only the top-level categories
    const topCategories = response.data._embedded.classifications.filter((classification) => !classification.subClassifications);
    cachedCategories = topCategories;  // Cache the results

    return topCategories;
  } catch (error) {
    console.error('Error fetching categories from Ticketmaster:', error.response ? error.response.data : error.message);
    throw new Error('Error fetching categories from Ticketmaster');
  }
};

// Controller function to get categories
const getCategories = async (req, res) => {
  try {
    const categories = await fetchCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
};



module.exports = { getCategories, fetchCategories};


