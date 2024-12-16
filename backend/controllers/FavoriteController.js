const axios = require('axios');
const { db } = require('../config/firebaseAdmin');
const { format, parseISO } = require('date-fns');
const { enUS } = require('date-fns/locale');
const { formatDistanceStrict, formatRelative } = require('date-fns');

// Function to get day suffix (e.g., 1st, 2nd, 3rd)
const getDayWithSuffix = (day) => {
  if (day > 3 && day < 21) return `${day}th`;
  switch (day % 10) {
    case 1: return `${day}st`;
    case 2: return `${day}nd`;
    case 3: return `${day}rd`;
    default: return `${day}th`;
  }
};

// Add an event to favorite
exports.addToFavorite = async (req, res) => {

  const userId = req.user?.uid;  // Extract user ID from the authenticated token
  const { eventId } = req.body;  // Extract only eventId from the request body


  // Validate userId to ensure it is correct and present
  if (!userId || typeof userId !== 'string') {
    console.error('Invalid or missing userId:', userId);
    return res.status(400).json({ message: 'Invalid user ID in token' });
  }

  // Validate eventId to ensure it is correct and present
  if (!eventId || typeof eventId !== 'string') {
    console.error('Invalid or missing eventId:', eventId);
    return res.status(400).json({ message: 'Invalid input data: eventId is missing or invalid' });
  }

  // Fetch event data from Ticketmaster API to confirm validity
  const apiUrl = `https://app.ticketmaster.com/discovery/v2/events/${eventId}.json?apikey=${process.env.TICKETMASTER_API_KEY}`;
  let event;
  try {
    const response = await axios.get(apiUrl);
    console.log('Ticketmaster API Response Status:', response.status);
    event = response?.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.error('Event not found in Ticketmaster API:', error.message);
      return res.status(404).json({ message: 'Event not found in Ticketmaster API' });
    }
    console.error('Error fetching event from Ticketmaster:', error.message);
    return res.status(500).json({ message: 'Failed to fetch event data' });
  }

  // Validate event data from API
  if (!event || !event.name || !event.dates?.start?.localDate) {
    console.error('Invalid event data from API:', event);
    return res.status(404).json({ message: 'Invalid event data from Ticketmaster API' });
  }

  // Extract venue data and format address
  const venueData = event._embedded?.venues?.[0];
  const venueAddress = venueData?.address?.line1 || '';
  const postalCode = venueData?.postalCode || '';
  const city = venueData?.city?.name || '';

  // Check if the event is already in the user's favorites
  console.log('Checking if event already exists in favorites...');
  const existingFavorite = await db.collection('favorites')
    .where('userId', '==', userId)
    .where('eventId', '==', eventId)
    .get();

  if (!existingFavorite.empty) {
    console.warn('Event is already in favorites for user:', userId);
    return res.status(400).json({ message: 'Event is already in favorites' });
  }

  // Add the event to the user's favorites
  console.log('Adding event to favorites...');
  await db.collection('favorites').add({
    userId,
    eventId,
    title: event.name,
    date: event.dates.start.localDate,
    time: event.dates.start.localTime || null,
    priceRange: event.priceRanges?.[0]?.min || null,
    imageUrl: event.images?.[0]?.url || null,
    category: event.classifications?.[0]?.genre?.name || null,
    venue: venueData?.name || null,
    venueAddress: JSON.stringify({
      line1: venueAddress,
      postalCode: postalCode,
      city: city,
    }),
    eventUrl: event.url || null,
    createdAt: new Date().toISOString(),
  });

  console.log('Event successfully added to favorites for user:', userId);
  res.status(201).json({ message: 'Event added to favorite' });
};

// Get all favorite events for a user
exports.getFavorite = async (req, res) => {
  const userId = req.user.uid;

  try {
    const snapshot = await db
      .collection('favorites')
      .where('userId', '==', userId)
      .get();

    const favorites = snapshot.docs.map((doc) => {
      const data = doc.data();
      const venueAddress = data.venueAddress ? JSON.parse(data.venueAddress) : null;

      // Format date to 'Wednesday, 18th of December'
      const date = parseISO(data.date);
      const dayWithSuffix = getDayWithSuffix(date.getDate());
      const formattedDate = format(date, `eeee, '${dayWithSuffix}' 'of' MMMM`, { locale: enUS });

      // Format time to "HH:mm" without seconds
      const formattedTime = data.time ? data.time.substring(0, 5) : 'Time not available';

      // Price format
      const price = data.priceRange ? `${data.priceRange} kr` : 'Not available';

      return {
        eventId: data.eventId,
        title: data.title,
        date: formattedDate,
        time: formattedTime,
        price: price,
        image: data.imageUrl,
        venueAddress: venueAddress
          ? `${venueAddress.line1}, ${venueAddress.postalCode} ${venueAddress.city}`
          : 'Address not available',
      };
    });

    res.json(favorites);
  } catch (error) {
    console.error('Error fetching favorites:', error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.removeFromFavorite = async (req, res) => {
  const userId = req.user.uid; // Hent bruger-ID fra decoded token
  const { favoriteId } = req.params; // favoriteId er egentlig eventId her

  try {
    console.log('Event ID from request:', favoriteId);
    console.log('User ID from token:', userId);

    // Find dokumentet med eventId og userId
    const snapshot = await db.collection('favorites')
      .where('userId', '==', userId)
      .where('eventId', '==', favoriteId)
      .get();

    if (snapshot.empty) {
      console.log('No matching favorite found');
      return res.status(404).json({ message: 'Favorite not found' });
    }

    // Slet det første matchende dokument
    const docId = snapshot.docs[0].id;
    await db.collection('favorites').doc(docId).delete();

    console.log('Favorite successfully deleted:', docId);
    return res.status(200).json({ message: 'Event removed from favorite' });
  } catch (error) {
    console.error('Error in removeFromFavorite:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
