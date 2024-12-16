require('dotenv').config();
const axios = require('axios');
const NodeCache = require('node-cache');
const myCache = new NodeCache({ stdTTL: 100, checkperiod: 120 });

// Hjælpefunktion til at vente
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Funktion til at implementere eksponentiel tilbagegang ved API-grænseoverskridelser
async function fetchWithExponentialBackoff(url, params, retries = 5, backoff = 300) {
  try {
      const response = await axios.get(url, { params });
      return response.data;
  } catch (error) {
      if (retries > 0 && error.response && error.response.status === 429) {
          await wait(backoff);
          return fetchWithExponentialBackoff(url, params, retries - 1, backoff * 2);
      } else {
          throw error;
      }
  }
}

// Funktion til at hente events baseret på brugerens GPS-placering, radius og kategori
const fetchEventsByLocation = async (userLatitude, userLongitude, radius, startDateTime, endDateTime, category) => {
  const key = `events_${userLatitude}_${userLongitude}_${radius}_${startDateTime}_${endDateTime}_${category}`;
  const cachedEvents = myCache.get(key);

  if (cachedEvents) {
      return cachedEvents;
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
      classificationName: category
  };

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

module.exports = { fetchEventsByLocation };
module.exports = fetchEventsByLocation;

// Funktion til at hente events for samme dag med 12.42 miles radius
const fetchSameDayEvents = async (userLatitude, userLongitude) => {
  const radius = Math.floor(12.42);  // Radius for samme dag i miles (husk at bruge heltal)
  const currentDate = new Date();
  const startDate = new Date(currentDate);
  startDate.setHours(0, 0, 0, 0);  // Starttidspunkt for dagen
  const endDate = new Date(currentDate);
  endDate.setHours(23, 59, 59, 0);  // Sluttidspunkt for dagen

  const dateRange = {
    start: startDate.toISOString().slice(0, -5) + "Z",
    end: endDate.toISOString().slice(0, -5) + "Z",
  };

  return await fetchEventsByLocation(userLatitude, userLongitude, radius, dateRange.start, dateRange.end);
};

// Funktion til at hente kommende begivenheder (op til en uge frem) med 24.85 miles radius
const fetchUpcomingEvents = async (userLatitude, userLongitude) => {
  const radius = Math.floor(24.85);  // Radius for kommende events i miles (brug Math.floor() for heltal)
  
  const currentDate = new Date();
  
  // Sæt startdato til i morgen
  const startDate = new Date(currentDate);
  startDate.setDate(currentDate.getDate() + 1);  // Start fra i morgen

  // Sæt slutdato til 7 dage frem fra i morgen
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 7);  // 7 dage frem fra i morgen

  const dateRange = {
    start: startDate.toISOString().slice(0, -5) + "Z",  // Startdato i ISO format
    end: endDate.toISOString().slice(0, -5) + "Z",      // Slutdato i ISO format
  };

  return await fetchEventsByLocation(userLatitude, userLongitude, radius, dateRange.start, dateRange.end);
};

// Controller-funktion til at hente specifik event
const getEventById = async (req, res) => {
  const { eventId } = req.params;
  const apiKey = process.env.TICKETMASTER_API_KEY;
  const apiUrl = `https://app.ticketmaster.com/discovery/v2/events/${eventId}.json`;

  try {
      const response = await axios.get(apiUrl, { params: { apikey: apiKey } });
      if (response.status !== 200) {
          return res.status(response.status).json({ message: `API call failed with status: ${response.status}` });
      }
      // Process response data to format as needed
      res.json(formatEventDetails(response.data));
  } catch (error) {
      console.error('Error fetching event detail:', error);
      res.status(500).json({ message: 'Failed to fetch event details', error: error.message });
  }
};

// Helper to format event details if needed
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

module.exports = { getEventById };


const getEvents = async (req, res) => {
  const { latitude, longitude, eventDate } = req.query;

  try {
      let events = [];
      if (eventDate === 'sameDay') {
          events = await fetchSameDayEvents(latitude, longitude);
      } else if (eventDate === 'upcoming') {
          events = await fetchUpcomingEvents(latitude, longitude);
      }

      res.status(200).json(events); // Returner korrekt formaterede events
  } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: error.message || 'Error fetching events from Ticketmaster' });
  }
};

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
      throw new Error('Address not found'); // Rettet fejlmeddelelse
    }
  } catch (error) {
    console.error('Error fetching coordinates:', error.response ? error.response.data : error.message);
    throw new Error('Address not found'); // Matcher testen
  }
};

// Funktion til at hente events baseret på hovedkategori
const fetchEventsByCategory = async (userLatitude, userLongitude, radius, startDateTime, endDateTime, mainCategory) => {
  try {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    const apiUrl = 'https://app.ticketmaster.com/discovery/v2/events.json';

    // Find subkategorier baseret på hovedkategorien
    const subCategories = await getSubCategories(mainCategory);

    const params = {
      apikey: apiKey,
      latlong: `${userLatitude},${userLongitude}`,
      radius: radius,
      startDateTime: startDateTime,
      endDateTime: endDateTime,
      classifications: subCategories, // Brug både hovedkategorier og subkategorier til at hente events
    };

    const response = await axios.get(apiUrl, { params });

    return response.data._embedded ? response.data._embedded.events : [];
  } catch (error) {
    console.error('Error fetching events from Ticketmaster:', error.response ? error.response.data : error.message);
    throw new Error('Error fetching events from Ticketmaster');
  }
};

// Sample implementation for getting subcategories for a given main category
const getSubCategories = async (mainCategory) => {
  // Mock implementation; replace with real logic if needed
  if (mainCategory === 'music') {
    return 'music,rock,pop';
  } else if (mainCategory === 'sports') {
    return 'sports,football,basketball';
  }
  return mainCategory; // Default to main category if no specific subcategories found
};

module.exports = { 
  fetchEventsByLocation, 
  fetchSameDayEvents, 
  fetchUpcomingEvents, 
  getEventById, 
  formatEventDetails,
  getEvents, 
  getCoordinatesFromAddress, 
  fetchEventsByCategory, 
  getSubCategories 
};
