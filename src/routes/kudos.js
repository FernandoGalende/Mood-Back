const uuid = require('uuid/v4');
const jwtDecode = require('jwt-decode');
const { getUser } = require('./utils');

const TABLE_NAME = process.env.KUDOS_TABLE;
const { USERS_TABLE } = process.env;

const prepareRequestItem = (fromName, message, email) => ({
  PutRequest: {
    Item: {
      date: { S: Date.now().toString() },
      from: { S: fromName },
      id: { S: uuid() },
      message: { S: message },
      to: { S: email },
      type: { S: 'kudos' },
    },
  },
});

function updateUser(req, data) {
  data.forEach((kudo) => {
    const params = {
      TableName: USERS_TABLE,
      Key: {
        email: kudo.to,
      },
      UpdateExpression: 'set unread = list_append(unread, :u)',
      ExpressionAttributeValues: {
        ':u': [kudo],
      },
    };

    req.documentClient.update(params, (err, updatedData) => {
      if (err) {
        console.log(err);
      } else {
        console.log(updatedData);
        console.log(params);
      }
    });
  });
}

function newKudos(req, res) {
  const { to } = req.body;
  const params = { RequestItems: {} };
  params.RequestItems[TABLE_NAME] = [];
  let insertKudo = [];

  to.forEach((user) => {
    const fromName = getUser(req);
    const requestItem = prepareRequestItem(
      fromName,
      req.body.message,
      user.email,
    );
    params.RequestItems[TABLE_NAME].push(requestItem);
    insertKudo = [
      ...insertKudo,
      {
        id: requestItem.PutRequest.Item.id.S,
        to: user.email,
        from: fromName,
        text: req.body.message,
        date: Date.now(),
      },
    ];
  });

  req.dynamoInstance.batchWriteItem(params, (err, data) => {
    if (err) {
      res.status(500).send({ error: err, message: 'Error with dynamo' });
    } else {
      res.status(200).send({
        data,
        message: 'Element inserted correctly"',
      });
      updateUser(req, insertKudo);
    }
  });
}

function getKudos(req, res) {
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'dateIndex',
    KeyConditionExpression: '#t = :k',
    ExpressionAttributeNames: {
      '#t': 'type',
    },
    ExpressionAttributeValues: {
      ':k': 'kudos',
    },
    ScanIndexForward: false,
  };

  const { from, limit, ...users } = req.query;
  // params.Limit = limit ? parseInt(limit, 10) + 1 : 25;

  if (from && from !== '0') {
    params.ExpressionAttributeNames['#d'] = 'date';
    params.KeyConditionExpression += ' and #d < :from';
    params.ExpressionAttributeValues[':from'] = from;
  }

  // // Filter by user
  if (Object.keys(users).length) {
    Object.keys(users).forEach((key, index) => {
      if (index === 0) {
        params.ExpressionAttributeNames['#to'] = 'to';
        params.FilterExpression = `#to = :${key}`;
        params.ExpressionAttributeValues[`:${key}`] = users[key];
      } else {
        params.FilterExpression += ` or #to = :${key}`;
        params.ExpressionAttributeValues[`:${key}`] = users[key];
      }
    });
  }

  req.documentClient.query(params, (err, data) => {
    if (err) {
      res.status(500).send({ error: err, message: 'Error with dynamo' });
    } else {
      const newData = data.Items.length <= limit ? data : { Items: data.Items.slice(0, limit) };
      res.status(200).send({
        data: newData,
        hasAfter: data.Items.length > limit,
        message: 'Elements fetched correctly"',
      });
    }
  });
}

function getNotifications(req, res) {
  let { idtoken: idToken } = req.headers;
  if (idToken) {
    idToken = jwtDecode(idToken);
  } else {
    res.status(400).send({ msg: 'id token not found in headers' });
    return;
  }
  const from = idToken.sub.split('|')[2];
  const params = {
    TableName: USERS_TABLE,
    ProjectionExpression: 'unread',
    KeyConditionExpression: 'email = :f',
    ExpressionAttributeValues: {
      ':f': from,
    },
  };

  req.documentClient.query(params, (err, rawData) => {
    if (err) {
      res.status(500).send({ error: err, message: 'Problem fetching unreads' });
    } else {
      res.status(200).send({
        data:
          rawData
          && rawData.Items
          && rawData.Items[0]
          && rawData.Items[0].unread !== undefined
            ? rawData.Items[0].unread
            : false,
      });
    }
  });
}

function removeNotification(req, res) {
  let { idtoken: idToken } = req.headers;
  if (idToken) {
    idToken = jwtDecode(idToken);
  } else {
    res.status(400).send({ msg: 'id token not found in headers' });
    return;
  }
  const from = idToken.sub.split('|')[2];
  const { index } = req.params;

  const params = {
    TableName: USERS_TABLE,
    Key: {
      email: from,
    },
    UpdateExpression: `REMOVE unread[${index}]`,
    ReturnValues: 'UPDATED_NEW',
  };

  req.documentClient.update(params, (err, data) => {
    if (err) {
      res
        .status(500)
        .send({ error: err, message: 'Problem removing notification' });
    } else {
      res.status(200).send({
        data,
      });
    }
  });
}

module.exports = {
  getKudos, newKudos, getNotifications, removeNotification,
};
