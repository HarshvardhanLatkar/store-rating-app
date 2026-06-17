const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/userController');

router.use(auth);
router.get('/stores', ctrl.getStores);
router.post('/rate', ctrl.submitRating);

module.exports = router;