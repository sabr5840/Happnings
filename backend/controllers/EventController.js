
require('dotenv').config(); 
const axios = require('axios');

// Funktion til at hente events baseret på brugerens GPS-placering, radius og kategori
const fetchEventsByLocation = async (userLatitude, userLongitude, radius, startDateTime, endDateTime, category) => {
  try {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    const apiUrl = 'https://app.ticketmaster.com/discovery/v2/events.json';
    const radiusInMiles = Math.floor(radius);

    if (radiusInMiles > 19999) {
      throw new Error('Radius cannot exceed 19,999 miles');
    }

    const params = {
      apikey: apiKey,
      latlong: `${userLatitude},${userLongitude}`,
      radius: radiusInMiles,
      startDateTime,
      endDateTime,
    };

    if (category) {
      params.classifications = category;
    }

    const response = await axios.get(apiUrl, { params });
    return response.data._embedded ? response.data._embedded.events : [];
  } catch (error) {
    if (error.message.includes('Radius')) {
      throw new Error('Radius cannot exceed 19,999 miles');
    }
    console.error('Error fetching events from Ticketmaster:', error.response ? error.response.data : error.message);
    throw new Error('Error fetching events from Ticketmaster');
  }
};


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

  try {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    const apiUrl = `https://app.ticketmaster.com/discovery/v2/events/${eventId}.json`;

    const response = await axios.get(apiUrl, { params: { apikey: apiKey } });

    const venue = response.data._embedded.venues[0];
    const venueAddress = venue ? {
      address: venue.address.line1,
      postalCode: venue.postalCode || 'N/A',
      city: venue.city.name || 'N/A',
      country: venue.country.name || 'N/A'
    } : {};

    const image = response.data.images.find(image => image.ratio === '16_9');
    
    // Use the image with the best resolution
    const imageUrl = image ? image.url : null;
    const imageWidth = image ? image.width : 640;  // Default width
    const imageHeight = image ? image.height : 360; // Default height

    const event = {
      id: response.data.id,
      name: response.data.name,
      date: response.data.dates.start.localDate,
      time: response.data.dates.start.localTime,
      priceRange: response.data.priceRanges ? response.data.priceRanges[0].min : 'N/A',
      imageUrl: imageUrl,
      imageWidth: imageWidth,
      imageHeight: imageHeight,  // Now includes the width and height
      category: response.data.classifications[0]?.genre.name,
      venue: venue ? venue.name : 'N/A',
      venueAddress: venueAddress,
      eventUrl: response.data.url
    };

    res.json(event);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: error.message || 'Error fetching event from Ticketmaster' });
  }
};

const getEvents = async (req, res) => {
  const { latitude, longitude, eventDate, location, startDate, endDate, category } = req.query;

  try {
    let events = [];
    let userLatitude = latitude;
    let userLongitude = longitude;

    if (location) {
      const { lat, lng } = await getCoordinatesFromAddress(location);
      userLatitude = lat;
      userLongitude = lng;
    }

    if (startDate && endDate) {
      events = await fetchEventsByLocation(userLatitude, userLongitude, 24.85, startDate, endDate, category);
    } else if (eventDate === 'sameDay') {
      events = await fetchSameDayEvents(userLatitude, userLongitude);
    } else if (eventDate === 'upcoming') {
      events = await fetchUpcomingEvents(userLatitude, userLongitude);
    } else {
      events = await fetchSameDayEvents(userLatitude, userLongitude);
    }

    res.status(200).json(events); // Tilføjet statuskald
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
      console.log('Geocoded coordinates:', location);
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
  getEvents, 
  getCoordinatesFromAddress, 
  fetchEventsByCategory, 
  getSubCategories 
};
