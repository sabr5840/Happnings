require('dotenv').config();
const axios = require('axios');
const NodeCache = require('node-cache');
const myCache = new NodeCache({ stdTTL: 100, checkperiod: 120 });

// Hjælpefunktion til at vente
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Funktion til eksponentiel tilbagegang ved API-grænseoverskridelser (status 429)
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

// Cache til classifications
let cachedClassifications = null;
let classificationCacheTimestamp = null;
const CLASSIFICATION_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 timer

// Hent alle classification data og cache dem
async function fetchClassifications() {
  const now = Date.now();
  if (cachedClassifications && classificationCacheTimestamp && (now - classificationCacheTimestamp < CLASSIFICATION_CACHE_DURATION)) {
    return cachedClassifications;
  }

  const apiKey = process.env.TICKETMASTER_API_KEY;
  const url = 'https://app.ticketmaster.com/discovery/v2/classifications.json';
  const params = { apikey: apiKey };
  
  const data = await fetchWithExponentialBackoff(url, params);
  if (!data._embedded || !data._embedded.classifications) {
    throw new Error('Invalid classification data from Ticketmaster');
  }

  cachedClassifications = data._embedded.classifications;
  classificationCacheTimestamp = now;
  return cachedClassifications;
}

/**
 * Få alle underkategorier (genres, subgenres, types, subtypes) for en given top-kategori (segment).
 * Returnerer en kommasepareret liste af classificationId'er, der kan bruges i et events-kald.
 */
async function getSubCategoriesForSegment(segmentName) {
  const classifications = await fetchClassifications();

  // Find alle classificationer, hvor segment matcher segmentName
  const matchedClassifications = classifications.filter(c => 
    c.segment && c.segment.name.toLowerCase() === segmentName.toLowerCase()
  );

  if (!matchedClassifications || matchedClassifications.length === 0) {
    // Hvis ingen match - returner tom streng
    return '';
  }

  let classificationIds = [];

  // For alle matchende classificationer tilføj segment, genre, subGenre, type, subType hvis de findes
  for (const c of matchedClassifications) {
    if (c.segment && c.segment.id) classificationIds.push(c.segment.id);
    if (c.genre && c.genre.id) classificationIds.push(c.genre.id);
    if (c.subGenre && c.subGenre.id) classificationIds.push(c.subGenre.id);
    if (c.type && c.type.id) classificationIds.push(c.type.id);
    if (c.subType && c.subType.id) classificationIds.push(c.subType.id);
  }

  // Fjern duplikerede id'er
  classificationIds = [...new Set(classificationIds)];

  return classificationIds.join(',');
}

// Funktion til at hente events baseret på brugerens GPS-placering, radius, datointerval og evt. kategori (oprindelig)
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
  };

  // Hvis category er sat, tilføj classificationName
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

// Funktion til at hente events for samme dag med radius ~12.42 miles
const fetchSameDayEvents = async (userLatitude, userLongitude) => {
  const radius = Math.floor(12.42);  
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

// Funktion til at hente kommende begivenheder (op til en uge frem) med radius ~24.85 miles
const fetchUpcomingEvents = async (userLatitude, userLongitude) => {
  const radius = Math.floor(24.85); 
  const currentDate = new Date();

  const startDate = new Date(currentDate);
  startDate.setDate(currentDate.getDate() + 1);  // Start fra i morgen
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 7);  // 7 dage frem

  const dateRange = {
    start: startDate.toISOString().slice(0, -5) + "Z",
    end: endDate.toISOString().slice(0, -5) + "Z",
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
    res.json(formatEventDetails(response.data));
  } catch (error) {
    console.error('Error fetching event detail:', error);
    res.status(500).json({ message: 'Failed to fetch event details', error: error.message });
  }
};

// Helper til at formatere eventdetaljer
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

// Funktion til at hente koordinater fra adresse
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

// (Fra tidligere kode - hvis du ønsker at bruge det til specifik hovedkategori-kald)
const fetchEventsByCategory = async (userLatitude, userLongitude, radius, startDateTime, endDateTime, mainCategory) => {
  try {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    const apiUrl = 'https://app.ticketmaster.com/discovery/v2/events.json';

    // Her kunne du bruge getSubCategoriesForSegment i stedet for getSubCategories hvis ønsket
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

// Eksempel på en tidligere funktion til at hente "mock" subkategorier
const getSubCategories = async (mainCategory) => {
  // Mock implementation, du kan tilpasse efter behov
  if (mainCategory === 'music') {
    return 'music,rock,pop';
  } else if (mainCategory === 'sports') {
    return 'sports,football,basketball';
  }
  return mainCategory;
};

// Ny funktion til at hente events baseret på flere top-kategorier
async function fetchEventsByCategories(userLatitude, userLongitude, radius, startDateTime, endDateTime, mainCategories) {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  const apiUrl = 'https://app.ticketmaster.com/discovery/v2/events.json';

  // Hent alle relevante classificationId'er for alle valgte kategorier
  let allClassificationIds = [];
  for (const category of mainCategories) {
    const categoryIds = await getSubCategoriesForSegment(category);
    if (categoryIds) {
      allClassificationIds.push(categoryIds);
    }
  }

  // Kombiner alle classificationIds i ét kommasepareret string
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

// Controller-funktion til at hente events
// Accepterer nu optional query param "categories" (kommasepareret liste af top-kategorier)
const getEvents = async (req, res) => {
  const { latitude, longitude, eventDate, categories } = req.query;
  const categoryArray = categories ? categories.split(',') : [];

  try {
    let events = [];
    let radius = eventDate === 'sameDay' ? Math.floor(12.42) : Math.floor(24.85);

    const currentDate = new Date();
    let startDate, endDate;

    if (eventDate === 'sameDay') {
      startDate = new Date(currentDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(currentDate);
      endDate.setHours(23, 59, 59, 0);
    } else if (eventDate === 'upcoming') {
      startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() + 1);  
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
    }

    const dateRange = {
      start: startDate.toISOString().slice(0, -5) + "Z",
      end: endDate.toISOString().slice(0, -5) + "Z",
    };

    if (categoryArray.length > 0) {
      // Hent events baseret på kategorier og underkategorier
      events = await fetchEventsByCategories(
        latitude,
        longitude,
        radius,
        dateRange.start,
        dateRange.end,
        categoryArray
      );
    } else {
      // Ingen kategorier - brug original fetch-funktion
      if (eventDate === 'sameDay') {
        events = await fetchEventsByLocation(latitude, longitude, radius, dateRange.start, dateRange.end);
      } else if (eventDate === 'upcoming') {
        events = await fetchEventsByLocation(latitude, longitude, radius, dateRange.start, dateRange.end);
      }
    }

    res.status(200).json(events);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: error.message || 'Error fetching events from Ticketmaster' });
  }
};

// Eksporter alle funktioner
module.exports = { 
  fetchEventsByLocation, 
  fetchSameDayEvents, 
  fetchUpcomingEvents, 
  getEventById, 
  formatEventDetails,
  getEvents, 
  getCoordinatesFromAddress, 
  fetchEventsByCategory,
  getSubCategories // Hvis du fortsat ønsker at beholde disse
};
