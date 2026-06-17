const db = require('../config/db');

// GET STORE DASHBOARD
exports.getDashboard = async (req, res) => {
  try {
    const [stores] = await db.query(
      `SELECT s.id, s.name, s.address,
              ROUND(AVG(r.rating), 1) as avg_rating
       FROM stores s
       LEFT JOIN ratings r ON s.id = r.store_id
       WHERE s.owner_id = ?
       GROUP BY s.id`,
      [req.user.id]
    );

    if (stores.length === 0)
      return res.status(404).json({ message: 'No store found for this owner' });

    const storeId = stores[0].id;

    const [raters] = await db.query(
      `SELECT u.name, u.email, r.rating, r.created_at
       FROM ratings r
       JOIN users u ON r.user_id = u.id
       WHERE r.store_id = ?
       ORDER BY r.created_at DESC`,
      [storeId]
    );

    res.json({ store: stores[0], raters });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};