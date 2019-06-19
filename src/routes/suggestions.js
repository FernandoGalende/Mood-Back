const uuid = require('uuid/v4');
const jwtDecode = require('jwt-decode');
const { getUser } = require('./utils');

const TABLE_NAME = process.env.SUGGESTIONS_MOOD_TABLE;

function newSuggestion(req, res) {
  const timestamp = Date.now();

  if (!req.body.message) {
    res.status(500).send({ errMsg: 'Message can not be empty' });
    return;
  }

  const params = {
    TableName: TABLE_NAME,
    Item: {
      user: getUser(req),
      id: uuid(),
      message: req.body.message,
      date: timestamp.toString(),
      dateLastModified: timestamp.toString(),
      read: false,
      answered: false,
      type: 'suggestion',
      isAnonymous: req.body.anonymous,
    },
  };

  req.documentClient.put(params, (err, data) => {
    if (err) {
      res.status(500).send({ error: err, message: 'Error with dynamoDB' });
    } else {
      res.status(200).send({
        item: params,
        data,
        message: 'All good with suggestions table!',
      });
    }
  });
}

function modifySuggestion(req, res) {
  const timestamp = Date.now();
  const { suggestion } = req.body;

  const params = {
    TableName: TABLE_NAME,
    Item: {
      user: suggestion.user,
      id: suggestion.id,
      message: suggestion.message,
      type: 'suggestion',
      date: suggestion.date,
      dateLastModified: timestamp.toString(),
      read: suggestion.read,
      answered: suggestion.answered,
      isAnonymous: suggestion.isAnonymous,
    },
  };

  const { conversation } = suggestion;
  if (conversation) {
    params.Item.conversation = conversation;
  }

  req.documentClient.put(params, (err, data) => {
    if (err) {
      res.status(500).send({ error: err, message: 'Error with dynamoDB' });
    } else {
      res.status(200).send({
        item: params,
        data,
        message: 'All good with suggestions table!',
      });
    }
  });
}

function getSuggestions(req, res) {
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'dateIndex',
    KeyConditionExpression: '#t = :s',
    ExpressionAttributeNames: {
      '#t': 'type',
    },
    ExpressionAttributeValues: {
      ':s': 'suggestion',
    },
    ScanIndexForward: false,
  };

  const { from, limit, ...users } = req.query;

  if (from && from !== '0') {
    params.KeyConditionExpression += ' and #d < :from';
    params.ExpressionAttributeNames['#d'] = 'date';
    params.ExpressionAttributeValues[':from'] = from;
  }

  // // Filter by user
  if (Object.keys(users).length) {
    Object.keys(users).forEach((key, index) => {
      if (index === 0) {
        params.ExpressionAttributeNames['#u'] = 'user';
        params.FilterExpression = `#u = :${key}`;
        params.ExpressionAttributeValues[`:${key}`] = users[key];
      } else {
        params.FilterExpression += ` or #u = :${key}`;
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
        message: 'Elements fetched correctly',
      });
    }
  });
}

function getSuggestionsFromUser(req, res) {
  const { user } = req.query;
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'dateIndex',
    KeyConditionExpression: '#t = :s',
    FilterExpression: '#u = :email',
    ExpressionAttributeNames: {
      '#t': 'type',
      '#u': 'user',
    },
    ExpressionAttributeValues: {
      ':s': 'suggestion',
      ':email': user,
    },
    ScanIndexForward: false,
  };

  const { from, limit } = req.query;

  if (from && from !== '0') {
    params.KeyConditionExpression += ' and #d < :from';
    params.ExpressionAttributeNames['#d'] = 'date';
    params.ExpressionAttributeValues[':from'] = from;
  }

  req.documentClient.query(params, (err, data) => {
    if (err) {
      res.status(500).send({ error: err, message: 'Error with dynamo' });
    } else {
      const newData = data.Items.length <= limit ? data : { Items: data.Items.slice(0, limit) };
      res.status(200).send({
        data: newData,
        hasAfter: data.Items.length >= limit,
        message: 'Elements fetched correctly',
      });
    }
  });
}

function handleResponseAnonSuggestion(token, data, res) {
  if (data) {
    res.status(200).send({
      data,
      message: 'Elements fetched correctly',
    });
  } else {
    res.status(404).send({
      message: `Element with token: ${token} does not exist, or is not an anonymous suggestion`,
    });
  }
}

function canErase(user, idtoken) {
  const idToken = jwtDecode(idtoken);
  const email = idToken.sub.split('|')[2];
  if (email === user) {
    return true;
  }
  const { groups } = idToken['<prodURL>'];
  if (groups && groups.includes('HR')) {
    return true;
  }
  return false;
}

function deleteSuggestion(req, res) {
  const { user } = req.query;
  const { id } = req.params;
  const { idtoken } = req.headers;
  if (!canErase(user, idtoken)) {
    res.status(403).send({ msg: 'You are not allowed to delete this thought!' });
  }
  const params = {
    TableName: TABLE_NAME,
    Key: {
      user: { S: user },
      id: { S: id },
    },
  };

  req.dynamoInstance.deleteItem(params, (err, data) => {
    if (err) {
      res.status(500).send({ error: err, message: 'Error with dynamo' });
    } else {
      res.status(200).send({
        params,
        data,
        msg: 'Element deleted succesfully',
      });
    }
  });
}


function getAnonSuggestionById(req, res) {
  const { token } = req.params;

  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: '#u = :a and #i = :value',
    ExpressionAttributeNames: {
      '#u': 'user',
      '#i': 'id',
    },
    ExpressionAttributeValues: {
      ':a': 'anonymous',
      ':value': token,
    },
  };

  req.documentClient.query(params, (err, data) => {
    if (err) {
      res.status(503).send({ error: err, message: 'Error with dynamo' });
    } else {
      handleResponseAnonSuggestion(token, data.Items[0], res);
    }
  });
}

module.exports = {
  getAnonSuggestionById,
  getSuggestions,
  getSuggestionsFromUser,
  modifySuggestion,
  newSuggestion,
  deleteSuggestion,
};
