/**
 * AWS Scanner Utility
 * 
 * Provides methods to scan AWS resources (EC2 instances, S3 buckets, RDS databases)
 * with proper error handling, logging, and pagination support.
 */

const AWS = require('aws-sdk');

class AwsScanner {
  constructor() {
    this.ec2 = new AWS.EC2();
    this.s3 = new AWS.S3();
    this.rds = new AWS.RDS();
    this.cloudwatch = new AWS.CloudWatch();
  }

  /**
   * Scans EC2 instances
   * @returns {Promise<Array>} Array of EC2 instance details
   */
  async scanEc2Instances() {
    try {
      console.log('Scanning EC2 instances...');
      
      const instances = [];
      let nextToken = null;
      
      do {
        const params = nextToken ? { NextToken: nextToken } : {};
        const response = await this.ec2.describeInstances(params).promise();
        
        // Process instances from the response
        response.Reservations.forEach(reservation => {
          reservation.Instances.forEach(instance => {
            instances.push({
              id: instance.InstanceId,
              type: instance.InstanceType,
              state: instance.State.Name,
              availabilityZone: instance.Placement.AvailabilityZone,
              privateIp: instance.PrivateIpAddress,
              publicIp: instance.PublicIpAddress,
              launchTime: instance.LaunchTime,
              name: this.getNameFromTags(instance.Tags),
              platform: instance.Platform || 'linux',
              rootDeviceType: instance.RootDeviceType,
              vpcId: instance.VpcId,
              subnetId: instance.SubnetId
            });
          });
        });
        
        nextToken = response.NextToken;
      } while (nextToken);
      
      console.log(`Found ${instances.length} EC2 instances`);
      return instances;
    } catch (error) {
      console.error('Error scanning EC2 instances:', error);
      throw new Error(`EC2 scan failed: ${error.message}`);
    }
  }

  /**
   * Scans S3 buckets
   * @returns {Promise<Array>} Array of S3 bucket details
   */
  async scanS3Buckets() {
    try {
      console.log('Scanning S3 buckets...');
      
      const response = await this.s3.listBuckets().promise();
      
      // Process buckets and get additional metadata
      const bucketPromises = response.Buckets.map(async bucket => {
        const bucketInfo = {
          name: bucket.Name,
          creationDate: bucket.CreationDate,
          region: '',
          versioning: false,
          websiteEnabled: false,
          tags: {}
        };
        
        try {
          // Get bucket location
          const locationResponse = await this.s3.getBucketLocation({ Bucket: bucket.Name }).promise();
          bucketInfo.region = locationResponse.LocationConstraint || 'us-east-1';
          
          // Get bucket versioning
          const versioningResponse = await this.s3.getBucketVersioning({ Bucket: bucket.Name }).promise();
          bucketInfo.versioning = versioningResponse.Status === 'Enabled';
          
          // Try to get website configuration
          try {
            await this.s3.getBucketWebsite({ Bucket: bucket.Name }).promise();
            bucketInfo.websiteEnabled = true;
          } catch (websiteError) {
            // If website configuration doesn't exist, this will fail - that's okay
            bucketInfo.websiteEnabled = false;
          }
          
          // Try to get tags
          try {
            const tagsResponse = await this.s3.getBucketTagging({ Bucket: bucket.Name }).promise();
            bucketInfo.tags = this.convertTagsToObject(tagsResponse.TagSet);
          } catch (tagsError) {
            // If tags don't exist, this will fail - that's okay
            bucketInfo.tags = {};
          }
        } catch (error) {
          // If any of the additional calls fail, we still want to return the basic bucket info
          console.warn(`Error getting additional info for bucket ${bucket.Name}:`, error.message);
        }
        
        return bucketInfo;
      });
      
      const buckets = await Promise.all(bucketPromises);
      console.log(`Found ${buckets.length} S3 buckets`);
      return buckets;
    } catch (error) {
      console.error('Error scanning S3 buckets:', error);
      throw new Error(`S3 scan failed: ${error.message}`);
    }
  }

  /**
   * Scans RDS databases
   * @returns {Promise<Array>} Array of RDS database details
   */
  async scanRdsDatabases() {
    try {
      console.log('Scanning RDS databases...');
      
      const instances = [];
      let marker = null;
      
      do {
        const params = marker ? { Marker: marker } : {};
        const response = await this.rds.describeDBInstances(params).promise();
        
        // Process instances from the response
        for (const dbInstance of response.DBInstances) {
          // Fetch metrics for the instance
          const metrics = await this.getRdsMetrics(dbInstance.DBInstanceIdentifier);
          
          instances.push({
            identifier: dbInstance.DBInstanceIdentifier,
            engine: dbInstance.Engine,
            engineVersion: dbInstance.EngineVersion,
            instanceClass: dbInstance.DBInstanceClass,
            status: dbInstance.DBInstanceStatus,
            multiAZ: dbInstance.MultiAZ,
            storageType: dbInstance.StorageType,
            allocatedStorage: dbInstance.AllocatedStorage,
            endpoint: dbInstance.Endpoint ? {
              address: dbInstance.Endpoint.Address,
              port: dbInstance.Endpoint.Port
            } : null,
            availabilityZone: dbInstance.AvailabilityZone,
            publiclyAccessible: dbInstance.PubliclyAccessible,
            metrics
          });
        }
        
        marker = response.Marker;
      } while (marker);
      
      console.log(`Found ${instances.length} RDS instances`);
      return instances;
    } catch (error) {
      console.error('Error scanning RDS databases:', error);
      throw new Error(`RDS scan failed: ${error.message}`);
    }
  }

  /**
   * Gets CloudWatch metrics for an RDS instance
   * @param {string} dbInstanceIdentifier - The RDS instance identifier
   * @returns {Promise<Object>} RDS metrics
   */
  async getRdsMetrics(dbInstanceIdentifier) {
    try {
      // Get the current time and time 1 hour ago
      const endTime = new Date();
      const startTime = new Date(endTime - (60 * 60 * 1000)); // 1 hour ago
      
      // Define metrics to fetch
      const metricsToGet = [
        { name: 'CPUUtilization', statistic: 'Average' },
        { name: 'FreeableMemory', statistic: 'Average' },
        { name: 'ReadIOPS', statistic: 'Average' },
        { name: 'WriteIOPS', statistic: 'Average' },
        { name: 'DatabaseConnections', statistic: 'Average' }
      ];
      
      // Fetch each metric
      const metricPromises = metricsToGet.map(metric => {
        const params = {
          Namespace: 'AWS/RDS',
          MetricName: metric.name,
          Dimensions: [{ Name: 'DBInstanceIdentifier', Value: dbInstanceIdentifier }],
          StartTime: startTime,
          EndTime: endTime,
          Period: 300, // 5 minutes
          Statistics: [metric.statistic]
        };
        
        return this.cloudwatch.getMetricStatistics(params).promise()
          .then(data => {
            // Get the most recent datapoint
            const datapoints = data.Datapoints.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
            return {
              name: metric.name,
              value: datapoints.length > 0 ? datapoints[0][metric.statistic] : null,
              unit: datapoints.length > 0 ? datapoints[0].Unit : null
            };
          })
          .catch(error => {
            console.warn(`Error getting ${metric.name} for ${dbInstanceIdentifier}:`, error.message);
            return {
              name: metric.name,
              value: null,
              unit: null,
              error: error.message
            };
          });
      });
      
      const metrics = await Promise.all(metricPromises);
      
      // Convert to object format
      const metricsObject = {};
      metrics.forEach(metric => {
        metricsObject[metric.name] = {
          value: metric.value,
          unit: metric.unit
        };
      });
      
      return metricsObject;
    } catch (error) {
      console.error(`Error getting metrics for RDS instance ${dbInstanceIdentifier}:`, error);
      return {
        error: error.message
      };
    }
  }

  /**
   * Extracts the Name tag from AWS tags
   * @param {Array} tags - Array of AWS tags
   * @returns {string} The Name tag value or empty string
   */
  getNameFromTags(tags) {
    if (!tags || !Array.isArray(tags)) return '';
    
    const nameTag = tags.find(tag => tag.Key === 'Name');
    return nameTag ? nameTag.Value : '';
  }

  /**
   * Converts an array of AWS tags to an object
   * @param {Array} tags - Array of AWS tags
   * @returns {Object} Tags as key-value pairs
   */
  convertTagsToObject(tags) {
    if (!tags || !Array.isArray(tags)) return {};
    
    const tagsObject = {};
    tags.forEach(tag => {
      tagsObject[tag.Key] = tag.Value;
    });
    
    return tagsObject;
  }

  /**
   * Scans all supported AWS resources
   * @returns {Promise<Object>} Object containing all scanned resources
   */
  async scanAllResources() {
    try {
      console.log('Starting comprehensive AWS resource scan...');
      
      // Run all scans concurrently for better performance
      const [ec2Instances, s3Buckets, rdsDatabases] = await Promise.all([
        this.scanEc2Instances().catch(err => {
          console.error('EC2 scan error:', err);
          return { error: err.message };
        }),
        this.scanS3Buckets().catch(err => {
          console.error('S3 scan error:', err);
          return { error: err.message };
        }),
        this.scanRdsDatabases().catch(err => {
          console.error('RDS scan error:', err);
          return { error: err.message };
        })
      ]);
      
      console.log('AWS resource scan completed successfully');
      
      return {
        timestamp: new Date().toISOString(),
        ec2: ec2Instances,
        s3: s3Buckets,
        rds: rdsDatabases
      };
    } catch (error) {
      console.error('Error during AWS resource scan:', error);
      throw new Error(`AWS resource scan failed: ${error.message}`);
    }
  }
}

module.exports = new AwsScanner();

