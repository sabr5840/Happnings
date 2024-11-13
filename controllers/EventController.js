const db = require('../config/db');

// Hent filtrerede events baseret på valgte kategorier
exports.getFilteredEvents = async (req, res) => {
  let { categories } = req.query;

  // Tjek, om categories findes, og konverter til en liste af tal
  if (!categories) {
    return res.status(400).json({ message: 'Please provide one or more category IDs to filter by.' });
  }

  // Konverter categories til en array af tal, hvis den er en kommasepareret streng
  if (typeof categories === 'string') {
    categories = categories.split(',').map(Number);
  }

  console.log('Categories:', categories);  // Debug: Log kategorier
  console.log('Placeholders:', categories.map(() => '?').join(', '));  // Debug: Log placeholders

  try {
    const placeholders = categories.map(() => '?').join(', ');
    const query = `
      SELECT * FROM Event
      WHERE CategoryID IN (${placeholders})
    `;

    console.log('Query:', query);  // Debug: Log SQL query
    
    const [events] = await db.query(query, categories);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
