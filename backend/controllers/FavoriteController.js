const axios = require('axios');
const db = require('../config/db');

// Add an event to favorite
exports.addToFavorite = async (req, res) => {
  const userId = req.session.userId;
  const { eventId } = req.body;

  if (!eventId) {
    console.log("No event ID provided");
    return res.status(400).json({ message: 'Event ID is required' });
  }

  try {
    const apiUrl = `https://app.ticketmaster.com/discovery/v2/events/${eventId}.json?apikey=${process.env.TICKETMASTER_API_KEY}`;
    const response = await axios.get(apiUrl);

    const event = response?.data;
    if (!event || !event.name || !event.dates?.start?.localDate) {
      console.log("Invalid event data from API");
      return res.status(404).json({ message: 'Event not found' });
    }

    const [existingFavorites] = await db.query('SELECT * FROM Favorite WHERE User_ID = ? AND eventId = ?', [userId, eventId]);
    if (existingFavorites?.length > 0) {
      console.log("Event is already in favorites");
      return res.status(400).json({ message: 'Event is already in favorite' });
    }

    await db.query(
      'INSERT INTO Favorite (User_ID, eventId, Title, Date, Time, PriceRange, imageUrl, imageWidth, imageHeight, Category, Venue, VenueAddress, EventUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        userId,
        eventId,
        event.name,
        event.dates.start.localDate,
        event.dates.start.localTime || null,
        event.priceRanges?.[0]?.min || null,
        event.images?.[0]?.url || null,
        event.images?.[0]?.width || null,
        event.images?.[0]?.height || null,
        event.classifications?.[0]?.genre?.name || null,
        event._embedded?.venues?.[0]?.name || null,
        JSON.stringify(event._embedded?.venues?.[0]?.address) || null,
        event.url || null,
      ]
    );

    console.log("Event added to favorites");
    res.status(201).json({ message: 'Event added to favorite' });
  } catch (error) {
    if (error.response?.status === 404) {
      console.error("Event not found in API:", error.message);
      return res.status(404).json({ message: 'Event not found' });
    }
    console.error("Error in addToFavorite:", error.message);
    res.status(500).json({ error: 'Internal Server Error' });
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
