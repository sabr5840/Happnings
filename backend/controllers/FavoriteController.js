const db = require('../config/db');

// Add an event to favorite
exports.addToFavorite = async (req, res) => {
    const userId = req.session.userId;
    const { eventId } = req.body;
  
    try {
      if (!eventId) {
        return res.status(400).json({ message: 'Event ID is required' });
      }
  
      // Tjek om eventet eksisterer i databasen
      const [event] = await db.query('SELECT * FROM Events WHERE Event_ID = ?', [eventId]);
      if (event.length === 0) {
        return res.status(404).json({ message: 'Event not found' });
      }
  
      // Tjek om eventet allerede er tilføjet som favorit
      const [existingFavorite] = await db.query(
        'SELECT * FROM Favorite WHERE User_ID = ? AND Event_ID = ?',
        [userId, eventId]
      );
  
      if (existingFavorite.length > 0) {
        return res.status(400).json({ message: 'Event is already in favorite' });
      }
  
      // Tilføj eventet til favoritter
      await db.query(
        'INSERT INTO Favorite (User_ID, Event_ID) VALUES (?, ?)',
        [userId, eventId]
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
        `SELECT f.Favorite_ID, e.Event_ID, e.Title, e.Description, e.StartDateTime, e.Image_URL
         FROM Favorite f
         JOIN Events e ON f.Event_ID = e.Event_ID
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
  const userId = req.session.userId; // Hent brugerens ID fra session
  const { favoriteId } = req.params; // Hent favoriteId fra request-params

  try {
    // Udfør DELETE-forespørgsel i databasen
    const [result] = await db.query(
      'DELETE FROM Favorite WHERE Favorite_ID = ? AND User_ID = ?',
      [favoriteId, userId]
    );

    // Tjek om der blev slettet nogen rækker
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Favorite not found' });
    }

    // Returner success-svar
    return res.status(200).json({ message: 'Event removed from favorite' });
  } catch (error) {
    // Returner fejl, hvis noget går galt
    return res.status(500).json({ error: error.message });
  }
};
  