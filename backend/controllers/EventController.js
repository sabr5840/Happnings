
// Load environment variables from .env file
require('dotenv').config();
const axios = require('axios'); // Axios for making HTTP requests
const NodeCache = require('node-cache'); // Import NodeCache to cache data
const myCache = new NodeCache({ stdTTL: 100, checkperiod: 120 }); // Initialize cache with a standard TTL of 100 seconds and check period of 120 seconds

// Helper function to implement a delay
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to handle exponential backoff mechanism when rate limit is reached (HTTP 429)
async function fetchWithExponentialBackoff(url, params, retries = 5, backoff = 300) {
  try {
    const response = await axios.get(url, { params });
    return response.data;
  } catch (error) {
    if (retries > 0 && error.response && error.response.status === 429) {
      await wait(backoff); // Wait for the specified backoff time
      return fetchWithExponentialBackoff(url, params, retries - 1, backoff * 2);
    } else {
      throw error; // Throw error if retries are exhausted or other errors occur
    }
  }
}

// Cache for classifications with a 24-hour duration
let cachedClassifications = null;
let classificationCacheTimestamp = null;
const CLASSIFICATION_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Fetch all classification data from Ticketmaster API and cache it
async function fetchClassifications() {
  const now = Date.now();
  if (cachedClassifications && classificationCacheTimestamp && (now - classificationCacheTimestamp < CLASSIFICATION_CACHE_DURATION)) {
    return cachedClassifications; // Return cached data if still valid
  }

  const apiKey = process.env.TICKETMASTER_API_KEY;
  const url = 'https://app.ticketmaster.com/discovery/v2/classifications.json';
  const params = { apikey: apiKey };
  
  const data = await fetchWithExponentialBackoff(url, params); // Use exponential backoff function to fetch data
  if (!data._embedded || !data._embedded.classifications) {
    throw new Error('Invalid classification data from Ticketmaster'); // Check data validity
  }

  cachedClassifications = data._embedded.classifications; // Cache the fetched classifications
  classificationCacheTimestamp = now;
  return cachedClassifications;
}

/**
 * Retrieve all subcategories (genres, subgenres, types, subtypes) for a given top category (segment).
 * Returns a comma-separated list of classificationIds that can be used in an event call.
 */
async function getSubCategoriesForSegment(segmentName) {
  const classifications = await fetchClassifications(); // Fetch all classifications

  // Find all classifications where segment matches the provided segmentName
  const matchedClassifications = classifications.filter(c => 
    c.segment && c.segment.name.toLowerCase() === segmentName.toLowerCase()
  );

  if (!matchedClassifications || matchedClassifications.length === 0) {
    return '';// Return an empty string if no match is found
  }

  let classificationIds = []; // Initialize an array to store classification IDs

  // For all matching classifications, add segment, genre, subgenre, type, subtype IDs if they exist
  for (const c of matchedClassifications) {
    if (c.segment && c.segment.id) classificationIds.push(c.segment.id);
    if (c.genre && c.genre.id) classificationIds.push(c.genre.id);
    if (c.subGenre && c.subGenre.id) classificationIds.push(c.subGenre.id);
    if (c.type && c.type.id) classificationIds.push(c.type.id);
    if (c.subType && c.subType.id) classificationIds.push(c.subType.id);
  }

  // Remove duplicate IDs
  classificationIds = [...new Set(classificationIds)];

  return classificationIds.join(','); // Return classification IDs as a comma-separated string
}

// Function to fetch events based on user's GPS location, radius, date range, and optionally a category
const fetchEventsByLocation = async (userLatitude, userLongitude, radius, startDateTime, endDateTime, category) => {
  const key = `events_${userLatitude}_${userLongitude}_${radius}_${startDateTime}_${endDateTime}_${category}`;
  const cachedEvents = myCache.get(key);

  if (cachedEvents) {
    return cachedEvents; // Return cached events if available
  }

  const apiKey = process.env.TICKETMASTER_API_KEY;
  const apiUrl = 'https://app.ticketmaster.com/discovery/v2/events.json';

  const params = {
    apikey: apiKey,
    latlong: `${userLatitude},${userLongitude}`,
    radius: Math.floor(radius),
    startDateTime,
    endDateTime,
    sort: 'date,asc',
  };

  // Add category to the parameters if specified
  if (category) {
    params.classificationName = category;
  }

  try {
    const data = await fetchWithExponentialBackoff(apiUrl, params);
    const events = data._embedded ? data._embedded.events : [];
    myCache.set(key, events, 100);  // Cache the events
    return events;
  } catch (error) {
    console.error('Error fetching events from Ticketmaster:', error.message);
    throw new Error('Failed to fetch events');
  }
};

// Function to fetch events for the same day within a specified radius (about 24.85 miles - 40 km)
const fetchSameDayEvents = async (userLatitude, userLongitude) => {
  const radius = Math.floor(24.85);  
  const currentDate = new Date();
  const startDate = new Date(currentDate);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(currentDate);
  endDate.setHours(23, 59, 59, 0);

  const dateRange = {
    start: startDate.toISOString().slice(0, -5) + "Z",
    end: endDate.toISOString().slice(0, -5) + "Z",
  };

  return await fetchEventsByLocation(userLatitude, userLongitude, radius, dateRange.start, dateRange.end);
};

// Function to fetch events based on a keyword, user's GPS location, radius, and date range
const fetchEventsByKeyword = async (keyword, userLatitude, userLongitude, radius, startDateTime, endDateTime) => {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  const apiUrl = 'https://app.ticketmaster.com/discovery/v2/events.json';
  
  const params = {
    apikey: apiKey,
    keyword: keyword, // Sørg for, at keyword sendes med
    latlong: `${userLatitude},${userLongitude}`,
    radius: Math.floor(radius),
    startDateTime,
    endDateTime,
  };

  try {
    const data = await fetchWithExponentialBackoff(apiUrl, params);
    const events = data._embedded ? data._embedded.events : [];
    return events;
  } catch (error) {
    console.error('Error fetching events by keyword:', error.message);
    throw new Error('Failed to fetch events');
  }
};

// Function to fetch upcoming events (up to a week ahead) within a specified radius (about 24.85 miles - 40 km)
const fetchUpcomingEvents = async (userLatitude, userLongitude) => {
  const radius = Math.floor(24.85); 
  const currentDate = new Date();

  const startDate = new Date(currentDate);
  startDate.setDate(currentDate.getDate() + 1);   // Start from tomorrow
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 7);  // Up to 7 days ahead

  const dateRange = {
    start: startDate.toISOString().slice(0, -5) + "Z",
    end: endDate.toISOString().slice(0, -5) + "Z",
  };

  return await fetchEventsByLocation(userLatitude, userLongitude, radius, dateRange.start, dateRange.end);
};

// Controller function to retrieve a specific event
const getEventById = async (req, res) => {
  const { eventId } = req.params;
  const apiKey = process.env.TICKETMASTER_API_KEY;
  const apiUrl = `https://app.ticketmaster.com/discovery/v2/events/${eventId}.json`;

  try {
    const response = await axios.get(apiUrl, { params: { apikey: apiKey } });
    if (response.status !== 200) {
      return res.status(response.status).json({ message: `API call failed with status: ${response.status}` });
    }
    res.json(formatEventDetails(response.data));
  } catch (error) {
    console.error('Error fetching event detail:', error);
    res.status(500).json({ message: 'Failed to fetch event details', error: error.message });
  }
};

// Helper function to format event details
const formatEventDetails = (data) => {
  const venue = data._embedded?.venues[0];
  const image = data.images.find(image => image.ratio === '16_9');
  return {
    id: data.id,
    name: data.name,
    date: data.dates.start.localDate,
    time: data.dates.start.localTime,
    venue: venue ? venue.name : 'N/A',
    venueAddress: {
      address: venue?.address?.line1,
      city: venue?.city?.name,
      postalCode: venue?.postalCode,
      country: venue?.country?.name
    },
    imageUrl: image ? image.url : null,
    eventUrl: data.url
  };
};

// Function to get coordinates from an address using the Google Geocoding API
const getCoordinatesFromAddress = async (address) => {
  try {
    const geocodingApiKey = process.env.API_KEY_GEOCODING;  
    const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json`;

    const response = await axios.get(geocodingUrl, {
      params: {
        address: address,
        key: geocodingApiKey,
      },
    });

    if (response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    } else {
      throw new Error('Address not found');
    }
  } catch (error) {
    console.error('Error fetching coordinates:', error.response ? error.response.data : error.message);
    throw new Error('Address not found');
  }
};

// Function to fetch events based on user's GPS coordinates, radius, time range, and main category
const fetchEventsByCategory = async (userLatitude, userLongitude, radius, startDateTime, endDateTime, mainCategory) => {
  try {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    const apiUrl = 'https://app.ticketmaster.com/discovery/v2/events.json';

    // Optionally use getSubCategoriesForSegment to fetch specific subcategory IDs instead of getSubCategories
    const subCategories = await getSubCategories(mainCategory);

    const params = {
      apikey: apiKey,
      latlong: `${userLatitude},${userLongitude}`,
      radius: radius,
      startDateTime: startDateTime,
      endDateTime: endDateTime,
      classifications: subCategories,
    };

    const response = await axios.get(apiUrl, { params });

    return response.data._embedded ? response.data._embedded.events : [];
  } catch (error) {
    console.error('Error fetching events from Ticketmaster:', error.response ? error.response.data : error.message);
    throw new Error('Error fetching events from Ticketmaster');
  }
};

// Mock function to fetch subcategories based on main category (e.g., music, sports)
const getSubCategories = async (mainCategory) => {
  // Example implementation, adjust as needed
  if (mainCategory === 'music') {
    return 'music,rock,pop';
  } else if (mainCategory === 'sports') {
    return 'sports,football,basketball';
  }
  return mainCategory;
};

// Function to fetch events based on multiple top categories
async function fetchEventsByCategories(userLatitude, userLongitude, radius, startDateTime, endDateTime, mainCategories) {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  const apiUrl = 'https://app.ticketmaster.com/discovery/v2/events.json';

  // Fetch all relevant classification IDs for the selected categories
  let allClassificationIds = [];
  for (const category of mainCategories) {
    const categoryIds = await getSubCategoriesForSegment(category);
    if (categoryIds) {
      allClassificationIds.push(categoryIds);
    }
  }

  // Combine all classification IDs into a single comma-separated string
  const classificationIdString = allClassificationIds.join(',');

  const params = {
    apikey: apiKey,
    latlong: `${userLatitude},${userLongitude}`,
    radius: Math.floor(radius),
    startDateTime,
    endDateTime,
    classificationId: classificationIdString,
    sort: 'date,asc',
  };

  try {
    const data = await fetchWithExponentialBackoff(apiUrl, params);
    const events = data._embedded ? data._embedded.events : [];
    return events;
  } catch (error) {
    console.error('Error fetching events by categories from Ticketmaster:', error.message);
    throw new Error('Failed to fetch events by categories');
  }
}

// Function to get events based on query parameters (latitude, longitude, event date, categories, radius)
const getEvents = async (req, res) => {
  const { latitude, longitude, eventDate, categories, radius } = req.query;
  const categoryArray = categories ? categories.split(',') : [];

  try {
    let events = [];

    let usedRadius = radius ? Math.floor(radius) : 24.85; // Default radius if none specified

    let startDate, endDate;
    // Check if eventDate is "sameDay", "upcoming" or a specific date
    if (eventDate === 'sameDay') {
      const currentDate = new Date();
      startDate = new Date(currentDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(currentDate);
      endDate.setHours(23, 59, 59, 0);
    } else if (eventDate === 'upcoming') {
      const currentDate = new Date();
      startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() + 1);  
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
    } else {
      // Expect eventDate to be a 'YYYY-MM-DD' string
      const chosenDate = new Date(eventDate + "T00:00:00Z");
      if (isNaN(chosenDate)) {
        return res.status(400).json({message: "Invalid date format"});
      }
      startDate = new Date(chosenDate);
      startDate.setHours(0,0,0,0);
      endDate = new Date(chosenDate);
      endDate.setHours(23,59,59,0);
    }

    const dateRange = {
      start: startDate.toISOString().slice(0, -5) + "Z",
      end: endDate.toISOString().slice(0, -5) + "Z",
    };

    if (categoryArray.length > 0) {
      events = await fetchEventsByCategories(
        latitude,
        longitude,
        usedRadius,
        dateRange.start,
        dateRange.end,
        categoryArray
      );
    } else {
      events = await fetchEventsByLocation(latitude, longitude, usedRadius, dateRange.start, dateRange.end);
    }

    res.status(200).json(events);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: error.message || 'Error fetching events from Ticketmaster' });
  }
};

// Function to fetch events by a keyword and optionally by country code
const getEventsKeyword = async (req, res) => {
  const { keyword, countryCode } = req.query;  // Læs countryCode, hvis givet

  if (!keyword) {
    return res.status(400).json({ message: 'Keyword parameter is required' });
  }

  try {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    const apiUrl = 'https://app.ticketmaster.com/discovery/v2/events.json';

    const params = {
      apikey: apiKey,
      keyword: keyword
    };

    // Add country code if provided
    if (countryCode) {
      params.countryCode = countryCode;
    }

    const data = await fetchWithExponentialBackoff(apiUrl, params);
    const events = data._embedded ? data._embedded.events : [];
    
    if (events.length === 0) {
      return res.status(404).json({ message: 'No events found for the given keyword.' });
    }

    res.status(200).json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Failed to fetch events', error: error.message });
  }
};

// Export all functions
module.exports = { 
  fetchEventsByLocation, 
  fetchSameDayEvents, 
  fetchUpcomingEvents, 
  getEventById, 
  formatEventDetails,
  getEvents, 
  getCoordinatesFromAddress, 
  fetchEventsByCategory,
  getSubCategories, 
  getEventsKeyword,
  fetchEventsByKeyword,
  fetchClassifications,
  getSubCategoriesForSegment
};

