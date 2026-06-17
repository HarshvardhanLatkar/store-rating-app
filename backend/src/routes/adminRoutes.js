const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/adminController');

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
  next();
};

router.use(auth, isAdmin);
router.get('/dashboard', ctrl.getDashboard);
router.post('/users', ctrl.addUser);
router.post('/stores', ctrl.addStore);
router.get('/users', ctrl.getUsers);
router.get('/stores', ctrl.getStores);
router.get('/users/:id', ctrl.getUserById);

module.exports = router;