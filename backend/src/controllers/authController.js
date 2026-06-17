const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// SIGNUP - only normal users
exports.signup = async (req, res) => {
  const { name, email, password, address } = req.body;

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
      [name, email, hashed, address, 'user']
    );
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(400).json({ message: 'Email already exists' });
    res.status(500).json({ message: 'Server error' });
  }
};

// LOGIN - all roles
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0)
      return res.status(400).json({ message: 'Invalid credentials' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.json({ token, role: user.role, name: user.name });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// UPDATE PASSWORD
exports.updatePassword = async (req, res) => {
  const { newPassword } = req.body;
  const passRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,16}$/;
  if (!passRegex.test(newPassword))
    return res.status(400).json({ message: 'Password: 8-16 chars, 1 uppercase, 1 special character' });

  try {
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
    res.json({ message: 'Password updated successfully' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};