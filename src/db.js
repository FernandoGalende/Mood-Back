const AWS = require('aws-sdk');

function getConfig() {
  const result = {
    region: 'eu-west-1',
  };

  if (process.env.DYNAMO_ENDPOINT) {
    result.endpoint = process.env.DYNAMO_ENDPOINT;
  }
  return result;
}

AWS.config.update(getConfig());

const dynamodb = new AWS.DynamoDB();
const documentClient = new AWS.DynamoDB.DocumentClient();

function dynamo(req, res, next) {
  req.dynamoInstance = dynamodb;
  req.documentClient = documentClient;
  next();
}

module.exports = { dynamo, documentClient };
