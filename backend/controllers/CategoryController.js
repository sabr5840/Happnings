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

// Get events with filtering and sorting
exports.getFilteredAndSortedEvents = async (req, res) => {
  const { categoryIds, startDates, sort, order } = req.query;

  // Debugging request parameters
  console.log('Raw Request Query:', req.query);

  // Validate that at least one filter or sorting is provided
  if (!categoryIds && !startDates && !sort) {
    return res.status(400).json({
      message: 'Please provide at least one filter (categoryIds or startDates) or sorting option (sort).',
    });
  }

  try {
    let query = `
      SELECT 
        Events.Event_ID, 
        Events.Title, 
        Events.Description, 
        Events.StartDateTime, 
        Events.EndDateTime, 
        Events.Price, 
        Events.Image_URL, 
        Category.Name AS CategoryName 
      FROM Events
      LEFT JOIN Category ON Events.CategoryID = Category.Category_ID
    `;
    const params = [];
    const conditions = [];

    // Handle categoryIds filter
    if (categoryIds) {
      const categoryArray = categoryIds.split(',').map((id) => id.trim()).filter(Boolean);
      console.log('Parsed Category IDs:', categoryArray);
      if (categoryArray.length > 0) {
        conditions.push(`Category.Category_ID IN (${categoryArray.map(() => '?').join(',')})`);
        params.push(...categoryArray);
      }
    }

    // Handle startDates filter
    if (startDates) {
      const startDateArray = startDates.split(',').map((date) => date.trim());
      console.log('Parsed Start Dates:', startDateArray);
      if (startDateArray.length > 0) {
        // Match only the date part of StartDateTime
        conditions.push(`DATE(Events.StartDateTime) IN (${startDateArray.map(() => '?').join(',')})`);
        params.push(...startDateArray);
      }
    }

    // Add WHERE clause if there are conditions
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Handle sorting
    if (sort) {
      const validSortFields = ['StartDateTime', 'Price'];
      if (validSortFields.includes(sort)) {
        query += ` ORDER BY ${sort} ${order === 'desc' ? 'DESC' : 'ASC'}`;
      } else {
        return res.status(400).json({
          message: 'Invalid sort field. Valid fields are StartDateTime and Price.',
        });
      }
    }

    console.log('Final Query:', query); // Debug final query
    console.log('Parameters:', params); // Debug parameters

    const [events] = await db.query(query, params); // Execute query
    res.json(events); // Return events as JSON
  } catch (error) {
    console.error('Error during query execution:', error.message); // Debug errors
    res.status(500).json({ error: error.message }); // Handle errors
  }
};



