const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk');

// Initialize AWS SDK with environment variables
AWS.config.update({ region: process.env.AWS_REGION || 'us-east-1' });

// Initialize AWS service clients
const ec2 = new AWS.EC2();
const s3 = new AWS.S3();
const rds = new AWS.RDS();
const cloudwatch = new AWS.CloudWatch();

/**
 * @route   GET /api/aws/scan
 * @desc    Scan all AWS resources
 * @access  Private
 */
router.get('/scan', async (req, res) => {
  try {
    console.log('Starting full AWS resource scan...');
    
    // Get EC2 instances
    const ec2Response = await ec2.describeInstances().promise();
    const instances = [];
    
    ec2Response.Reservations.forEach(reservation => {
      reservation.Instances.forEach(instance => {
        instances.push({
          id: instance.InstanceId,
          type: instance.InstanceType,
          state: instance.State.Name,
          publicIp: instance.PublicIpAddress || 'N/A',
          privateIp: instance.PrivateIpAddress,
          launchTime: instance.LaunchTime
        });
      });
    });

    // Get S3 buckets
    const s3Response = await s3.listBuckets().promise();
    const buckets = s3Response.Buckets.map(bucket => ({
      name: bucket.Name,
      creationDate: bucket.CreationDate
    }));

    // Get RDS instances
    const rdsResponse = await rds.describeDBInstances().promise();
    const databases = rdsResponse.DBInstances.map(db => ({
      id: db.DBInstanceIdentifier,
      engine: db.Engine,
      status: db.DBInstanceStatus,
      size: db.DBInstanceClass,
      storage: `${db.AllocatedStorage} GB`,
      endpoint: db.Endpoint ? db.Endpoint.Address : 'N/A'
    }));

    return res.json({
      success: true,
      message: 'AWS resources scanned successfully',
      data: {
        ec2: instances,
        s3: buckets,
        rds: databases
      }
    });
  } catch (error) {
    console.error('Error scanning AWS resources:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to scan AWS resources: ${error.message}`,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/aws/ec2
 * @desc    Scan EC2 instances
 * @access  Private
 */
router.get('/ec2', async (req, res) => {
  try {
    console.log('Scanning EC2 instances...');
    const response = await ec2.describeInstances().promise();
    const instances = [];
    
    response.Reservations.forEach(reservation => {
      reservation.Instances.forEach(instance => {
        instances.push({
          id: instance.InstanceId,
          type: instance.InstanceType,
          state: instance.State.Name,
          publicIp: instance.PublicIpAddress || 'N/A',
          privateIp: instance.PrivateIpAddress,
          launchTime: instance.LaunchTime,
          tags: instance.Tags || []
        });
      });
    });

    return res.json({
      success: true,
      message: `Found ${instances.length} EC2 instances`,
      data: instances
    });
  } catch (error) {
    console.error('Error scanning EC2 instances:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to scan EC2 instances: ${error.message}`,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/aws/s3
 * @desc    Scan S3 buckets
 * @access  Private
 */
router.get('/s3', async (req, res) => {
  try {
    console.log('Scanning S3 buckets...');
    const response = await s3.listBuckets().promise();
    
    const buckets = await Promise.all(response.Buckets.map(async (bucket) => {
      // Get basic bucket info
      const bucketInfo = {
        name: bucket.Name,
        creationDate: bucket.CreationDate
      };
      
      try {
        // Try to get bucket location (region)
        const locationResponse = await s3.getBucketLocation({ Bucket: bucket.Name }).promise();
        bucketInfo.region = locationResponse.LocationConstraint || 'us-east-1';
      } catch (error) {
        console.log(`Could not get location for bucket ${bucket.Name}: ${error.message}`);
        bucketInfo.region = 'unknown';
      }
      
      return bucketInfo;
    }));

    return res.json({
      success: true,
      message: `Found ${buckets.length} S3 buckets`,
      data: buckets
    });
  } catch (error) {
    console.error('Error scanning S3 buckets:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to scan S3 buckets: ${error.message}`,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/aws/rds
 * @desc    Scan RDS databases
 * @access  Private
 */
router.get('/rds', async (req, res) => {
  try {
    console.log('Scanning RDS databases...');
    const response = await rds.describeDBInstances().promise();
    
    const databases = response.DBInstances.map(db => ({
      id: db.DBInstanceIdentifier,
      engine: db.Engine,
      version: db.EngineVersion,
      status: db.DBInstanceStatus,
      size: db.DBInstanceClass,
      storage: `${db.AllocatedStorage} GB`,
      endpoint: db.Endpoint ? db.Endpoint.Address : 'N/A',
      port: db.Endpoint ? db.Endpoint.Port : 'N/A',
      multiAZ: db.MultiAZ,
      encrypted: db.StorageEncrypted
    }));

    return res.json({
      success: true,
      message: `Found ${databases.length} RDS databases`,
      data: databases
    });
  } catch (error) {
    console.error('Error scanning RDS databases:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to scan RDS databases: ${error.message}`,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/aws/rds/:id/metrics
 * @desc    Get metrics for a specific RDS database
 * @access  Private
 */
router.get('/rds/:id/metrics', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Getting metrics for RDS database ${id}...`);
    
    // Get CPU utilization for the past hour
    const endTime = new Date();
    const startTime = new Date(endTime - (60 * 60 * 1000)); // 1 hour ago
    
    const cpuParams = {
      MetricName: 'CPUUtilization',
      Namespace: 'AWS/RDS',
      Period: 300, // 5-minute periods
      StartTime: startTime,
      EndTime: endTime,
      Statistics: ['Average', 'Maximum'],
      Dimensions: [
        {
          Name: 'DBInstanceIdentifier',
          Value: id
        }
      ]
    };
    
    const connectionsParams = {
      MetricName: 'DatabaseConnections',
      Namespace: 'AWS/RDS',
      Period: 300, // 5-minute periods
      StartTime: startTime,
      EndTime: endTime,
      Statistics: ['Average', 'Maximum'],
      Dimensions: [
        {
          Name: 'DBInstanceIdentifier',
          Value: id
        }
      ]
    };
    
    const freeStorageParams = {
      MetricName: 'FreeStorageSpace',
      Namespace: 'AWS/RDS',
      Period: 300, // 5-minute periods
      StartTime: startTime,
      EndTime: endTime,
      Statistics: ['Average'],
      Dimensions: [
        {
          Name: 'DBInstanceIdentifier',
          Value: id
        }
      ]
    };
    
    // Fetch metrics in parallel
    const [cpuResponse, connectionsResponse, storageResponse] = await Promise.all([
      cloudwatch.getMetricStatistics(cpuParams).promise(),
      cloudwatch.getMetricStatistics(connectionsParams).promise(),
      cloudwatch.getMetricStatistics(freeStorageParams).promise()
    ]);
    
    // Process the metrics data
    const metrics = {
      cpu: {
        datapoints: cpuResponse.Datapoints.map(dp => ({
          timestamp: dp.Timestamp,
          average: dp.Average,
          maximum: dp.Maximum,
          unit: dp.Unit
        })),
        current: cpuResponse.Datapoints.length > 0 
          ? cpuResponse.Datapoints.sort((a, b) => b.Timestamp - a.Timestamp)[0].Average.toFixed(2)
          : 'N/A'
      },
      connections: {
        datapoints: connectionsResponse.Datapoints.map(dp => ({
          timestamp: dp.Timestamp,
          average: dp.Average,
          maximum: dp.Maximum,
          unit: dp.Unit
        })),
        current: connectionsResponse.Datapoints.length > 0 
          ? Math.round(connectionsResponse.Datapoints.sort((a, b) => b.Timestamp - a.Timestamp)[0].Average)
          : 'N/A'
      },
      storage: {
        datapoints: storageResponse.Datapoints.map(dp => ({
          timestamp: dp.Timestamp,
          freeBytes: dp.Average,
          freeGB: (dp.Average / (1024 * 1024 * 1024)).toFixed(2),
          unit: dp.Unit
        })),
        current: storageResponse.Datapoints.length > 0 
          ? (storageResponse.Datapoints.sort((a, b) => b.Timestamp - a.Timestamp)[0].Average / (1024 * 1024 * 1024)).toFixed(2)
          : 'N/A'
      }
    };

    return res.json({
      success: true,
      message: `Retrieved metrics for RDS database ${id}`,
      data: metrics
    });
  } catch (error) {
    console.error(`Error getting metrics for RDS database ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: `Failed to get metrics for RDS database ${req.params.id}: ${error.message}`,
      error: error.message
    });
  }
});

module.exports = router;
