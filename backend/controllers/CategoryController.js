const db = require('../config/db');

// Get all categories
exports.getCategories = async (req, res) => {
  try {
    const [categories] = await db.query('SELECT Category_ID, Name FROM Category');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
