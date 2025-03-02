const OpenAI = require('openai');
const keys = require('../config/keys');

async function testConnections() {
  console.log('Testing connections...');
  
  console.log('OpenAI Configuration:', {
    apiKey: keys.openai.apiKey ? '***' : 'not set'
  });

  try {
    // Test OpenAI
    const openai = new OpenAI({
      apiKey: keys.openai.apiKey,
    });

    console.log('Testing OpenAI connection...');
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Test message" }],
    });

    console.log('OpenAI Test Result:', {
      status: 'success',
      model: completion.model
    });

    return {
      success: true,
      openai: true
    };
  } catch (error) {
    console.error('Connection test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = { testConnections };
