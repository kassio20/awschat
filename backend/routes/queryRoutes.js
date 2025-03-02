const express = require('express');
const router = express.Router();
const queryController = require('../controllers/queryController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

router.post('/process', queryController.processQuery);
router.get('/history/:clientId', queryController.getQueryHistory);

module.exports = router;

