const request = require('request');
const { documentClient } = require('../db');
const { getFilteredUsersOptions, getMgmtTokenOptions } = require('./utils');

const { USERS_TABLE } = process.env;
let MGMT_TOKEN = '';

function postUsersToDB(users) {
  users.forEach((user) => {
    const params = {
      TableName: USERS_TABLE,
      Item: {
        email: user.email.toLowerCase(),
        name: user.given_name,
        nameSlug: user.given_name.toLowerCase(),
        lastName: user.family_name,
        lastNameSlug: user.family_name.toLowerCase(),
        picture: user.picture,
        type: 'user',
        unread: [],
      },
    };
    documentClient.put(params, (err) => {
      if (err) {
        console.log(`Error for user: ${user.email}, ${err}`);
      } else {
        console.log(`Succesfully inserted: ${user.email.toLowerCase()}`);
      }
    });
  });
}

function getRecommendedUsers() {
  request(getFilteredUsersOptions(MGMT_TOKEN), (error, response, rawBody) => {
    let body = {};
    try {
      body = JSON.parse(rawBody);
    } catch (err) {
      console.log('ERROR', err);
      process.exit(1);
    }
    if (error || body.statusCode === 429) {
      console.log('ERROR', error);
      process.exit(1);
    }
    postUsersToDB(body);
  });
}

function getAllUsers() {
  request(getMgmtTokenOptions, (error, response, rawBody) => {
    if (error) {
      console.log('ERROR', error);
      process.exit(1);
    } else {
      let body = {};
      try {
        body = JSON.parse(rawBody);
      } catch (err) {
        console.log('ERROR', error);
        process.exit(1);
      }

      MGMT_TOKEN = body.access_token;
      getRecommendedUsers();
    }
  });
}

getAllUsers();
