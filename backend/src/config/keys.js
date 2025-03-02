require('dotenv').config();

module.exports = {
  huggingface: {
    apiKey: process.env.HUGGINGFACE_API_KEY
  },
  aws: {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
    region: process.env.AWS_REGION,
    config: {
      apiVersion: 'latest'
    }
  }
};
