const OpenAI = require('openai');
const AWS = require('aws-sdk');

console.log('Initializing ChatService with OpenAI and AWS...');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configure AWS SDK
AWS.config.update({ region: process.env.AWS_REGION || 'us-east-1' });

class ChatService {
  constructor() {
    try {
      console.log('Initializing AWS service clients...');
      this.ec2 = new AWS.EC2();
      this.rds = new AWS.RDS();
      this.s3 = new AWS.S3();
      this.costExplorer = new AWS.CostExplorer();
      console.log('AWS service clients initialized successfully');
    } catch (error) {
      console.error('Error initializing AWS services:', error.message);
      throw new Error(`AWS services initialization failed: ${error.message}`);
    }
  }

  isDateWithinRange(date) {
    const now = new Date();
    const fourteenMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 14, 1);
    return date >= fourteenMonthsAgo;
  }

  async getCostData(serviceName = null, startDate = null, endDate = null) {
    try {
      if (!startDate) {
        const date = new Date();
        startDate = new Date(date.getFullYear(), date.getMonth() - 1, 1);
        endDate = new Date(date.getFullYear(), date.getMonth(), 1);
      }

      // Check if the requested date range is within the allowed period
      if (!this.isDateWithinRange(startDate)) {
        throw new Error('Requested date is beyond the available 14-month historical data range');
      }
      
      const params = {
        TimePeriod: {
          Start: startDate.toISOString().split('T')[0],
          End: endDate.toISOString().split('T')[0]
        },
        Granularity: 'MONTHLY',
        Metrics: ['UnblendedCost']
      };

      if (serviceName) {
        params.Filter = {
          Dimensions: {
            Key: 'SERVICE',
            Values: [serviceName]
          }
        };
      }

      console.log('Fetching cost data with params:', JSON.stringify(params, null, 2));
      const costData = await this.costExplorer.getCostAndUsage(params).promise();
      console.log('Received cost data:', JSON.stringify(costData, null, 2));
      
      return costData.ResultsByTime.map(result => ({
        period: result.TimePeriod,
        costs: {
          amount: result.Total.UnblendedCost.Amount ? parseFloat(result.Total.UnblendedCost.Amount) : 0,
          unit: result.Total.UnblendedCost.Unit || 'USD'
        }
      }));
    } catch (error) {
      console.error('Error fetching cost data:', error);
      throw new Error(`Failed to fetch cost data: ${error.message}`);
    }
  }

  async getAWSInfo(query) {
    const awsData = {};
    const queryLower = query.toLowerCase();
    
    try {
      // Handle date-specific queries
      let startDate, endDate;
      if (queryLower.includes('janeiro')) {
        // Use current year instead of hardcoded 2024
        const currentYear = new Date().getFullYear();
        startDate = new Date(currentYear, 0, 1);
        endDate = new Date(currentYear, 1, 1);
      }
      
      // If the question is about costs
      if (queryLower.includes('cost') || queryLower.includes('gast')) {
        if (queryLower.includes('rds')) {
          awsData.rdsCosts = await this.getCostData('Amazon Relational Database Service', startDate, endDate);
          // Also get RDS instance details
          const rdsData = await this.rds.describeDBInstances().promise();
          awsData.rdsInstances = rdsData.DBInstances.map(db => ({
            id: db.DBInstanceIdentifier,
            status: db.DBInstanceStatus,
            engine: db.Engine,
            class: db.DBInstanceClass
          }));
        } else {
          // Get all costs if no specific service mentioned
          awsData.costs = await this.getCostData(null, startDate, endDate);
        }
      }
      
      return awsData;
    } catch (error) {
      console.error('Error fetching AWS data:', error);
      throw new Error(`Failed to fetch AWS data: ${error.message}`);
    }
  }

  async processChat(message) {
    console.log('Processing chat message:', message);
    try {
      const awsData = await this.getAWSInfo(message);
      
      console.log('AWS data retrieved:', JSON.stringify(awsData, null, 2));
      
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an AWS expert assistant with access to real-time AWS account information. 
            When discussing costs:
            - Always provide specific numerical values from the data
            - Format currency values clearly (e.g., $123.45)
            - If data for a specific period is requested but not available, clearly state that
            - Break down costs by service when multiple services are involved
            Base all answers strictly on the provided AWS data.`
          },
          {
            role: "user",
            content: `AWS Account Data: ${JSON.stringify(awsData, null, 2)}\n\nUser Question: ${message}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      return {
        answer: completion.choices[0].message.content,
        awsData
      };
    } catch (error) {
      console.error('Error processing chat:', error);
      throw new Error(`Chat processing failed: ${error.message}`);
    }
  }
}

module.exports = new ChatService();
