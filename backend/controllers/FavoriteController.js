const axios = require('axios');
const { db } = require('../config/firebaseAdmin');

// Add an event to favorite
exports.addToFavorite = async (req, res) => {
  const userId = req.user.uid; // Hent userId fra det decoded token
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

    // Tjek om eventet allerede findes i favoritter
    const existingFavorite = await db
      .collection('favorites')
      .where('userId', '==', userId)
      .where('eventId', '==', eventId)
      .get();

    if (!existingFavorite.empty) {
      console.log("Event is already in favorites");
      return res.status(400).json({ message: 'Event is already in favorite' });
    }

    // Tilføj event til favoritter
    await db.collection('favorites').add({
      userId,
      eventId,
      title: event.name,
      date: event.dates.start.localDate,
      time: event.dates.start.localTime || null,
      priceRange: event.priceRanges?.[0]?.min || null,
      imageUrl: event.images?.[0]?.url || null,
      imageWidth: event.images?.[0]?.width || null,
      imageHeight: event.images?.[0]?.height || null,
      category: event.classifications?.[0]?.genre?.name || null,
      venue: event._embedded?.venues?.[0]?.name || null,
      venueAddress: JSON.stringify(event._embedded?.venues?.[0]?.address) || null,
      eventUrl: event.url || null,
      createdAt: new Date().toISOString(), // Tilføj tidstempel
    });

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
  const userId = req.user.uid; // Hent userId fra det decoded token

  try {
    const snapshot = await db
      .collection('favorites')
      .where('userId', '==', userId)
      .get();

    const favorites = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(favorites);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.removeFromFavorite = async (req, res) => {
  const userId = req.user.uid; // Hent bruger-ID fra decoded token
  const { favoriteId } = req.params;

  try {
    // Log favoriteId og userId
    console.log('Favorite ID from request:', favoriteId);
    console.log('User ID from token:', userId);

    // Hent dokumentet fra Firestore
    const favoriteDoc = await db.collection('favorites').doc(favoriteId).get();

    // Log data fra dokumentet
    console.log('Firestore Document Data:', favoriteDoc.exists ? favoriteDoc.data() : 'Document not found');

    if (!favoriteDoc.exists) {
      return res.status(404).json({ message: 'Favorite not found' });
    }

    // Tjek om userId matcher
    if (favoriteDoc.data().userId !== userId) {
      console.log('Unauthorized deletion attempt. Document userId:', favoriteDoc.data().userId);
      return res.status(403).json({ message: 'Unauthorized to delete this favorite' });
    }

    // Slet dokumentet
    await db.collection('favorites').doc(favoriteId).delete();

    console.log('Favorite successfully deleted:', favoriteId);
    return res.status(200).json({ message: 'Event removed from favorite' });
  } catch (error) {
    console.error('Error in removeFromFavorite:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

