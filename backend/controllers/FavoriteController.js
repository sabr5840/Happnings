const axios = require('axios');
const db = require('../config/db');

// Add an event to favorite
exports.addToFavorite = async (req, res) => {
  const userId = req.session.userId;
  const { eventId } = req.body;

  try {
    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    // Fetch event details from Ticketmaster API
    const apiKey = process.env.TICKETMASTER_API_KEY;
    const apiUrl = `https://app.ticketmaster.com/discovery/v2/events/${eventId}.json`;

    const response = await axios.get(apiUrl, { params: { apikey: apiKey } });

    // Extract relevant event details
    const event = response.data;
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Handle imageUrl, imageWidth, and imageHeight (fall back to default values if not available)
    const imageUrl = event.images && event.images.length > 0 ? event.images[0].url : 'backend/default/no_images.jpg';
    const imageWidth = event.images && event.images.length > 0 ? event.images[0].width : 640;  // Default width
    const imageHeight = event.images && event.images.length > 0 ? event.images[0].height : 360; // Default height

    // Extract other event details
    const venue = event._embedded?.venues ? event._embedded.venues[0].name : 'N/A';
    const venueAddress = event._embedded?.venues ? JSON.stringify(event._embedded.venues[0].address) : 'N/A';

    const eventDetails = {
      eventId: event.id,
      title: event.name,
      date: event.dates.start.localDate,
      time: event.dates.start.localTime,
      priceRange: event.priceRanges ? event.priceRanges[0].min : 'N/A',
      imageUrl: imageUrl,
      imageWidth: imageWidth,
      imageHeight: imageHeight,
      category: event.classifications[0]?.genre.name || 'N/A',
      venue: venue,
      venueAddress: venueAddress,
      eventUrl: event.url,
    };

    // Check if the event is already in the user's favorites
    const [existingFavorite] = await db.query(
      'SELECT * FROM Favorite WHERE User_ID = ? AND eventId = ?',
      [userId, eventId]
    );

    if (existingFavorite.length > 0) {
      return res.status(400).json({ message: 'Event is already in favorite' });
    }

    // Add event to favorite list
    await db.query(
      'INSERT INTO Favorite (User_ID, eventId, Title, Date, Time, PriceRange, imageUrl, imageWidth, imageHeight, Category, Venue, VenueAddress, EventUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        userId,
        eventId,
        eventDetails.title,
        eventDetails.date,
        eventDetails.time,
        eventDetails.priceRange,
        eventDetails.imageUrl,
        eventDetails.imageWidth,
        eventDetails.imageHeight,
        eventDetails.category,
        eventDetails.venue,
        eventDetails.venueAddress,
        eventDetails.eventUrl
      ]
    );

    res.status(201).json({ message: 'Event added to favorite' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all favorite events for a user
exports.getFavorite = async (req, res) => {
  const userId = req.session.userId;

  try {
    const [favorite] = await db.query(
      `SELECT f.Favorite_ID, f.eventId, f.title, f.date, f.time, f.priceRange, f.imageUrl, f.imageWidth, f.imageHeight, f.category, f.venue, f.venueAddress, f.eventUrl
       FROM Favorite f
       WHERE f.User_ID = ?`,
      [userId]
    );

    res.json(favorite);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Remove an event from favorite
exports.removeFromFavorite = async (req, res) => {
  const userId = req.session.userId;
  const { favoriteId } = req.params;

  try {
    const [result] = await db.query(
      'DELETE FROM Favorite WHERE Favorite_ID = ? AND User_ID = ?',
      [favoriteId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Favorite not found' });
    }

    return res.status(200).json({ message: 'Event removed from favorite' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
