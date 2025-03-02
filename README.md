# AWS Chat - IA Analysis Tool

A real-time chat interface for querying AWS RDS costs and usage information using natural language processing. This application enables users to get detailed cost insights about their AWS RDS instances through simple conversational queries.

## Architecture Overview

### Frontend
- Built with React.js
- Modern chat interface for user interactions
- Real-time message updates
- Responsive design for all devices

### Backend
- Node.js with Express framework
- AWS SDK integration for cost analysis
- OpenAI integration for natural language processing
- MongoDB for message persistence
- RESTful API architecture

### Infrastructure
- Docker containerization for all components
- Multi-container setup with docker-compose
- MongoDB for data persistence
- AWS SDK for cloud service integration

## Features

- Natural language queries for AWS costs
- Real-time RDS cost analysis
- Historical cost data access (up to 14 months)
- Detailed RDS instance information
- Cost breakdown by service
- Persistent chat history
- Error handling and data validation

## Prerequisites

- Node.js (v14 or higher)
- Docker and Docker Compose
- AWS Account with appropriate permissions
- OpenAI API key
- MongoDB (provided via Docker)

## Installation and Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/kassio20/awschat.git
   cd awschat
   ```

2. Create environment files:
   ```bash
   cp .env.example .env
   ```

3. Configure environment variables in `.env`:
   ```env
   # AWS Configuration
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_REGION=us-east-1
   AWS_ACCOUNT_ID=your_account_id

   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key

   # Application Configuration
   APP_ENV=development
   DEBUG=true
   API_PORT=3001
   API_HOST=0.0.0.0
   LOG_LEVEL=debug

   # MongoDB Configuration
   MONGODB_URI=mongodb://mongodb:27017/client-portal
   ```

4. Start the application using Docker Compose:
   ```bash
   docker-compose up -d
   ```

## Environment Variables

### Required Variables
- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret access key
- `AWS_REGION`: AWS region (default: us-east-1)
- `AWS_ACCOUNT_ID`: Your AWS account ID
- `OPENAI_API_KEY`: Your OpenAI API key

### Optional Variables
- `APP_ENV`: Application environment (development/production)
- `DEBUG`: Enable debug mode (true/false)
- `API_PORT`: Backend API port (default: 3001)
- `API_HOST`: Backend host address (default: 0.0.0.0)
- `LOG_LEVEL`: Logging level (debug/info/warn/error)
- `MONGODB_URI`: MongoDB connection string

## Usage

1. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

2. Example queries:
   - "How much did I spend on RDS last month?"
   - "What are my current RDS costs?"
   - "Show me RDS spending for the current month"
   - "List all my RDS instances"

## API Documentation

### Chat Endpoints

#### POST /api/chat
Send a message to the chat interface

Request body:
```json
{
  "message": "string"
}
```

Response:
```json
{
  "answer": "string",
  "awsData": {
    "rdsCosts": [...],
    "rdsInstances": [...]
  }
}
```

### AWS Data Endpoints

The application provides various endpoints for accessing AWS cost and resource information:

#### GET /api/aws/costs
Get cost information for specified services

Query parameters:
- `service`: AWS service name (optional)
- `startDate`: Start date for cost analysis (YYYY-MM-DD)
- `endDate`: End date for cost analysis (YYYY-MM-DD)

Response:
```json
{
  "costs": [
    {
      "period": {
        "start": "string",
        "end": "string"
      },
      "amount": "number",
      "unit": "string"
    }
  ]
}
```

## Error Handling

The application includes comprehensive error handling for:
- Invalid AWS credentials
- Missing OpenAI API key
- Database connection issues
- Rate limiting
- Invalid date ranges
- Service unavailability

## Development

For local development without Docker:

1. Start MongoDB locally
2. Install dependencies:
   ```bash
   cd frontend && npm install
   cd ../backend && npm install
   ```

3. Start services:
   ```bash
   # Terminal 1 - Frontend
   cd frontend && npm start

   # Terminal 2 - Backend
   cd backend && npm run dev
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

