import React, { useState } from 'react';
import { Box, TextField, Button, Paper, Typography, Container } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

function Chat() {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();
      
      setChatHistory(prev => [...prev, 
        { type: 'user', content: message },
        { type: 'assistant', content: data.answer, awsInfo: data.awsInfo }
      ]);
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      setChatHistory(prev => [...prev,
        { type: 'user', content: message },
        { type: 'error', content: 'Failed to get response. Please try again.' }
      ]);
    }
    setLoading(false);
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 2, mt: 2, height: '70vh', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flexGrow: 1, overflow: 'auto', mb: 2 }}>
          {chatHistory.map((msg, index) => (
            <Box
              key={index}
              sx={{
                mb: 2,
                p: 2,
                backgroundColor: msg.type === 'user' ? '#e3f2fd' : '#f5f5f5',
                borderRadius: 2,
              }}
            >
              <Typography variant="subtitle2" color="textSecondary">
                {msg.type === 'user' ? 'You' : 'Assistant'}:
              </Typography>
              <Typography variant="body1">
                {msg.content}
              </Typography>
              {msg.awsInfo && (
                <Box sx={{ mt: 1, fontSize: '0.8em', color: 'text.secondary' }}>
                  <Typography variant="caption">
                    AWS Resources:
                    EC2: {msg.awsInfo.ec2.length} instances,
                    S3: {msg.awsInfo.s3.length} buckets,
                    RDS: {msg.awsInfo.rds.length} databases
                  </Typography>
                </Box>
              )}
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Ask about your AWS environment..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={loading}
          />
          <Button
            variant="contained"
            color="primary"
            endIcon={<SendIcon />}
            onClick={handleSendMessage}
            disabled={loading}
          >
            Send
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default Chat;
