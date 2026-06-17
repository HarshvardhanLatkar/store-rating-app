const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/storeOwnerController');

const isOwner = (req, res, next) => {
  if (req.user.role !== 'store_owner') return res.status(403).json({ message: 'Access denied' });
  next();
};

router.use(auth, isOwner);
router.get('/dashboard', ctrl.getDashboard);

module.exports = router;