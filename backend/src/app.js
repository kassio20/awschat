const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const resourcesRouter = require('./routes/resources');
const chatRouter = require('./routes/chat');
const awsRouter = require('./routes/aws');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/resources', resourcesRouter);
app.use('/api/chat', chatRouter);
app.use('/api/aws', awsRouter);

module.exports = app;
