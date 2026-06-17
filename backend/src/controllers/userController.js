const db = require('../config/db');

// GET ALL STORES with user's rating
exports.getStores = async (req, res) => {
  const { name, address, sort = 'name', order = 'ASC' } = req.query;
  const allowed = ['name', 'address'];
  const sortCol = allowed.includes(sort) ? `s.${sort}` : 's.name';
  const sortOrder = order === 'DESC' ? 'DESC' : 'ASC';

  let query = `
    SELECT s.id, s.name, s.address,
           ROUND(AVG(r.rating), 1) as overall_rating,
           ur.rating as my_rating
    FROM stores s
    LEFT JOIN ratings r ON s.id = r.store_id
    LEFT JOIN ratings ur ON s.id = ur.store_id AND ur.user_id = ?
    WHERE 1=1
  `;
  const params = [req.user.id];

  if (name)    { query += ' AND s.name LIKE ?';    params.push(`%${name}%`); }
  if (address) { query += ' AND s.address LIKE ?'; params.push(`%${address}%`); }

  query += ` GROUP BY s.id, ur.rating ORDER BY ${sortCol} ${sortOrder}`;

  try {
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// SUBMIT or UPDATE RATING
exports.submitRating = async (req, res) => {
  const { store_id, rating } = req.body;
  if (rating < 1 || rating > 5)
    return res.status(400).json({ message: 'Rating must be between 1 and 5' });

  try {
    await db.query(
      `INSERT INTO ratings (user_id, store_id, rating) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = ?`,
      [req.user.id, store_id, rating, rating]
    );
    res.json({ message: 'Rating submitted successfully' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};