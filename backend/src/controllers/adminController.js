const db = require('../config/db');
const bcrypt = require('bcryptjs');

// DASHBOARD STATS
exports.getDashboard = async (req, res) => {
  try {
    const [[{ totalUsers }]] = await db.query('SELECT COUNT(*) as totalUsers FROM users WHERE role != "admin"');
    const [[{ totalStores }]] = await db.query('SELECT COUNT(*) as totalStores FROM stores');
    const [[{ totalRatings }]] = await db.query('SELECT COUNT(*) as totalRatings FROM ratings');
    res.json({ totalUsers, totalStores, totalRatings });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// ADD USER (normal user, admin, or store owner)
exports.addUser = async (req, res) => {
  const { name, email, password, address, role } = req.body;

  if (name.length < 20 || name.length > 60)
    return res.status(400).json({ message: 'Name must be 20-60 characters' });
  if (address && address.length > 400)
    return res.status(400).json({ message: 'Address max 400 characters' });
  const passRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,16}$/;
  if (!passRegex.test(password))
    return res.status(400).json({ message: 'Password: 8-16 chars, 1 uppercase, 1 special character' });

  try {
    const hashed = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (name, email, password, address, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashed, address, role]
    );
    res.status(201).json({ message: 'User added successfully' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(400).json({ message: 'Email already exists' });
    res.status(500).json({ message: 'Server error' });
  }
};

// ADD STORE
exports.addStore = async (req, res) => {
  const { name, email, address, owner_id } = req.body;
  try {
    await db.query(
      'INSERT INTO stores (name, email, address, owner_id) VALUES (?, ?, ?, ?)',
      [name, email, address, owner_id || null]
    );
    res.status(201).json({ message: 'Store added successfully' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(400).json({ message: 'Store email already exists' });
    res.status(500).json({ message: 'Server error' });
  }
};

// GET ALL USERS with filters
exports.getUsers = async (req, res) => {
  const { name, email, address, role, sort = 'name', order = 'ASC' } = req.query;
  const allowed = ['name', 'email', 'address', 'role'];
  const sortCol = allowed.includes(sort) ? sort : 'name';
  const sortOrder = order === 'DESC' ? 'DESC' : 'ASC';

  let query = 'SELECT id, name, email, address, role FROM users WHERE 1=1';
  const params = [];

  if (name)    { query += ' AND name LIKE ?';    params.push(`%${name}%`); }
  if (email)   { query += ' AND email LIKE ?';   params.push(`%${email}%`); }
  if (address) { query += ' AND address LIKE ?'; params.push(`%${address}%`); }
  if (role)    { query += ' AND role = ?';        params.push(role); }

  query += ` ORDER BY ${sortCol} ${sortOrder}`;

  try {
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET ALL STORES with filters + avg rating
exports.getStores = async (req, res) => {
  const { name, email, address, sort = 'name', order = 'ASC' } = req.query;
  const allowed = ['name', 'email', 'address'];
  const sortCol = allowed.includes(sort) ? `s.${sort}` : 's.name';
  const sortOrder = order === 'DESC' ? 'DESC' : 'ASC';

  let query = `
    SELECT s.id, s.name, s.email, s.address, 
           ROUND(AVG(r.rating), 1) as rating
    FROM stores s
    LEFT JOIN ratings r ON s.id = r.store_id
    WHERE 1=1
  `;
  const params = [];

  if (name)    { query += ' AND s.name LIKE ?';    params.push(`%${name}%`); }
  if (email)   { query += ' AND s.email LIKE ?';   params.push(`%${email}%`); }
  if (address) { query += ' AND s.address LIKE ?'; params.push(`%${address}%`); }

  query += ` GROUP BY s.id ORDER BY ${sortCol} ${sortOrder}`;

  try {
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET SINGLE USER DETAILS
exports.getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT id, name, email, address, role FROM users WHERE id = ?', [id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = rows[0];

    if (user.role === 'store_owner') {
      const [storeRows] = await db.query(
        `SELECT s.name as store_name, ROUND(AVG(r.rating),1) as avg_rating
         FROM stores s LEFT JOIN ratings r ON s.id = r.store_id
         WHERE s.owner_id = ? GROUP BY s.id`,
        [id]
      );
      user.stores = storeRows;
    }
    res.json(user);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};