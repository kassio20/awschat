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
    console.log('Initializing ChatService...');
    // Initialize AWS service clients
    try {
      console.log('Initializing AWS service clients...');
      this.ec2 = new AWS.EC2();
      this.rds = new AWS.RDS();
      this.s3 = new AWS.S3();
      this.costExplorer = new AWS.CostExplorer();
      this.elbv2 = new AWS.ELBv2();
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
      
      let cost;
      if (costData.ResultsByTime && costData.ResultsByTime.length > 0) {
        if (costData.ResultsByTime[0].Groups && costData.ResultsByTime[0].Groups.length > 0) {
          cost = costData.ResultsByTime[0].Groups[0].Metrics.UnblendedCost;
        } else if (costData.ResultsByTime[0].Total && costData.ResultsByTime[0].Total.UnblendedCost) {
          cost = costData.ResultsByTime[0].Total.UnblendedCost;
        }
      }

      return costData.ResultsByTime.map(result => ({
        period: result.TimePeriod,
        costs: {
          amount: cost ? parseFloat(cost.Amount) : 0,
          unit: cost ? cost.Unit : 'USD'
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
        const currentYear = new Date().getFullYear();
        startDate = new Date(currentYear, 0, 1);
        endDate = new Date(currentYear, 1, 1);
      }
      
      // If the question is about costs
      if (queryLower.includes('cost') || queryLower.includes('gast')) {
        if (queryLower.includes('rds')) {
          awsData.rdsCosts = await this.getCostData('Amazon Relational Database Service', startDate, endDate);
        } else if (queryLower.includes('ec2')) {
          awsData.costs = await this.getCostData('Amazon Elastic Compute Cloud - Compute', startDate, endDate);
        } else if (queryLower.includes('s3')) {
          awsData.costs = await this.getCostData('Amazon Simple Storage Service', startDate, endDate);
        } else {
          // Get all costs if no specific service mentioned
          awsData.costs = await this.getCostData(null, startDate, endDate);
        }
      }
      
      // For basic EC2 information
      if (queryLower.includes('ec2') || queryLower.includes('instancia')) {
        try {
          const ec2Response = await this.ec2.describeInstances().promise();
          awsData.ec2 = [];
          
          if (ec2Response && ec2Response.Reservations) {
            for (const reservation of ec2Response.Reservations) {
              for (const instance of reservation.Instances) {
                const nameTag = instance.Tags ? instance.Tags.find(tag => tag.Key === 'Name') : null;
                
                awsData.ec2.push({
                  id: instance.InstanceId,
                  type: instance.InstanceType,
                  state: instance.State.Name,
                  name: nameTag ? nameTag.Value : instance.InstanceId,
                  publicIp: instance.PublicIpAddress || 'N/A',
                  privateIp: instance.PrivateIpAddress || 'N/A',
                  launchTime: instance.LaunchTime
                });
              }
            }
          }
        } catch (error) {
          console.error('Error fetching EC2 instances:', error);
        }
      }
      
      // For basic S3 information
      if (queryLower.includes('s3') || queryLower.includes('bucket')) {
        try {
          const s3Response = await this.s3.listBuckets().promise();
          awsData.s3 = [];
          
          if (s3Response && s3Response.Buckets) {
            for (const bucket of s3Response.Buckets) {
              awsData.s3.push({
                name: bucket.Name,
                creationDate: bucket.CreationDate
              });
            }
          }
        } catch (error) {
          console.error('Error fetching S3 buckets:', error);
        }
      }
      
      // For basic RDS information
      if (queryLower.includes('rds') || queryLower.includes('database') || queryLower.includes('banco')) {
        try {
          const rdsResponse = await this.rds.describeDBInstances().promise();
          awsData.rds = [];
          
          if (rdsResponse && rdsResponse.DBInstances) {
            for (const db of rdsResponse.DBInstances) {
              awsData.rds.push({
                id: db.DBInstanceIdentifier,
                engine: db.Engine,
                version: db.EngineVersion,
                status: db.DBInstanceStatus,
                size: db.DBInstanceClass,
                storage: `${db.AllocatedStorage} GB`,
                endpoint: db.Endpoint ? db.Endpoint.Address : 'N/A'
              });
            }
          }
        } catch (error) {
          console.error('Error fetching RDS instances:', error);
        }
      }

      // For load balancer information
      if (queryLower.includes('load balancer') || queryLower.includes('balanceador') || queryLower.includes('elb')) {
        try {
          const elbResponse = await this.elbv2.describeLoadBalancers().promise();
          awsData.loadBalancers = [];
          
          if (elbResponse && elbResponse.LoadBalancers) {
            for (const lb of elbResponse.LoadBalancers) {
              // Get the tags for each load balancer
              const tagResponse = await this.elbv2.describeTags({
                ResourceArns: [lb.LoadBalancerArn]
              }).promise();
              
              const tags = tagResponse.TagDescriptions && tagResponse.TagDescriptions[0] ? 
                tagResponse.TagDescriptions[0].Tags : [];
              
              // Determine the load balancer type (Application or Network)
              const lbType = lb.Type === 'application' ? 'Application Load Balancer' : 
                            lb.Type === 'network' ? 'Network Load Balancer' : 
                            'Load Balancer';
              
              awsData.loadBalancers.push({
                name: lb.LoadBalancerName,
                dnsName: lb.DNSName,
                arn: lb.LoadBalancerArn,
                type: lbType,
                scheme: lb.Scheme,
                vpcId: lb.VpcId,
                state: lb.State && lb.State.Code,
                createdTime: lb.CreatedTime,
                tags: tags
              });
            }
          }
        } catch (error) {
          console.error('Error fetching Load Balancers:', error);
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
      console.log('AWS data retrieved');
      
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

When discussing EC2 instances:
- Include instance types, states, and IDs
- Mention any relevant performance metrics
- List public IPs if available
- Group by running/stopped state if there are many instances

When discussing S3 buckets:
- Include creation dates, regions, and bucket names
- Mention if versioning or website hosting is enabled
- Include any tags if they are meaningful

When discussing RDS databases:
- Include engine types, instance classes, and storage information
- Present CPU usage, connections, and other metrics clearly
- Highlight any performance issues based on metrics
- Include endpoint information if available

When discussing Load Balancers:
- Specify whether they are Application Load Balancers (ALB) or Network Load Balancers (NLB)
- Include DNS names, which are essential for connecting to the load balancers
- Mention their current state (active, provisioning, etc.)
- Include creation time and any relevant tags
- Note whether they are internet-facing or internal

Base all answers strictly on the provided AWS data.`
          },
          {
            role: "user",
            content: `AWS Account Data: ${JSON.stringify(awsData, null, 2)}\n\nUser Question: ${message}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      // Ensure the awsInfo object always contains ec2, s3, and rds arrays (even if empty)
      const awsInfo = {
        ec2: awsData.ec2 || [],
        s3: awsData.s3 || [],
        rds: awsData.rds || []
      };

      // Add any additional data that might be present
      if (awsData.costs) awsInfo.costs = awsData.costs;
      if (awsData.rdsCosts) awsInfo.rdsCosts = awsData.rdsCosts;
      if (awsData.timestamp) awsInfo.timestamp = awsData.timestamp;
      if (awsData.loadBalancers) awsInfo.loadBalancers = awsData.loadBalancers;

      return {
        answer: completion.choices[0].message.content,
        awsInfo
      };
    } catch (error) {
      console.error('Error processing chat:', error);
      return {
        answer: `Desculpe, ocorreu um erro ao processar sua pergunta: ${error.message}`,
        error: error.message
      };
    }
  }
}

module.exports = new ChatService();
