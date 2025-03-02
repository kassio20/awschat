const express = require('express');
const router = express.Router();
const chatService = require('../services/chatService');

router.post('/', async (req, res) => {
  console.log('Received chat request:', req.body);
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const response = await chatService.processChat(message);
    console.log('Chat response generated successfully');
    res.json(response);
  } catch (error) {
    console.error('Chat route error:', error);
    res.status(500).json({
      error: 'Failed to process chat message',
      details: error.message
    });
  }
});

module.exports = router;
