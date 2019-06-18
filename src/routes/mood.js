const jwtRequire = require('jwt-decode');
const uuid = require('uuid/v4');
const { getUser } = require('./utils');

const TABLE_NAME = process.env.GENERAL_MOOD_TABLE;

const graphData = {
  people: 0,
  emotionsVoted: [],
  percentages: [],
};

const emotions = [
  { id: 'awesome', name: 'Awesome!', color: '#005fff' },
  { id: 'pretty-good', name: 'Good', color: '#00ad3b' },
  { id: 'meh', name: 'Meh', color: '#ffd800' },
  { id: 'not-great', name: 'Not Good', color: '#7908dd' },
  { id: 'terrible', name: 'Terrible', color: '#f50038' },
];

function getData(value) {
  return emotions.reduce((acc, emotion) => {
    const newAcc = [...acc, emotion[value]];
    return newAcc;
  }, []);
}

function getFilterFromVotes(votes, filter) {
  return votes.reduce((acc, valor) => {
    const newAcc = [...acc, valor[filter]];
    return newAcc;
  }, []);
}
function getHowManyPeople(votes) {
  return new Set(getFilterFromVotes(votes, 'user')).size;
}

function countEmotions(votes) {
  graphData.emotionsVoted = getData('id')
    .reduce((acc, emotion) => {
      const newAcc = [
        ...acc,
        votes.reduce((contador, voto) => {
          let newCont = contador;
          const votesPerEmotion = voto.mood.S === emotion ? (newCont += 1) : newCont;
          return votesPerEmotion;
        }, 0),
      ];
      return newAcc;
    }, []);
}

function getPercentage(emotionsVoted) {
  graphData.percentages = [];
  for (let i = 0; i < emotions.length; i += 1) {
    const percent = parseFloat(
      (
        (graphData.emotionsVoted[i] * 100)
        / emotionsVoted.length
      ).toFixed(0),
    );
    graphData.percentages.push({
      name: emotions[i].id,
      percent: percent || 0,
    });
  }
}

function getStartOfWeek(date) {
  const diff = date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1);
  return new Date(date.setDate(diff)).setHours(0, 0, 0, 0).toString();
}

function getEndOfWeek(date) {
  const diff = date.getDate() - date.getDay() + 7;
  return new Date(date.setDate(diff)).setHours(0, 0, 0, 0).toString();
}

function getLastMood(req, res) {
  const { idtoken } = req.headers;
  const user = jwtRequire(idtoken).sub.split('|')[2];
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'dateIndex',
    KeyConditionExpression: '#t = :m',
    FilterExpression: '#u = :value',
    ExpressionAttributeNames: {
      '#t': 'type',
      '#u': 'user',
    },
    ExpressionAttributeValues: {
      ':m': 'moods',
      ':value': user,
    },
    ScanIndexForward: false,
  };
  req.documentClient.query(params, (err, rawData) => {
    if (err) {
      res.status(503).send({ error: err, message: 'Error with dynamo' });
    } else {
      const data = { Items: [] };
      if (rawData.Items.length > 0) {
        data.Items.push(rawData.Items[0]);
      }
      res.status(200).send({
        data, message: 'Elements fetched correctly',
      });
    }
  });
}

function getMoods(req, res) {
  const { from, to, ...users } = req.query;

  const params = {
    TableName: TABLE_NAME,
    ProjectionExpression: '#d, mood, #u',
    FilterExpression: '#d BETWEEN :from and :to',
    ExpressionAttributeNames: {
      '#d': 'date',
      '#u': 'user',
    },
  };

  if (from !== '0' || to !== '0') {
    if (from && to === '0') {
      params.FilterExpression = '#d >= :from ';
      params.ExpressionAttributeValues = {
        ':from': { S: from },
      };
    } else if (to && from === '0') {
      params.FilterExpression = '#d <= :to ';
      params.ExpressionAttributeValues = {
        ':to': { S: to },
      };
    } else if (from && to) {
      params.FilterExpression = '#d BETWEEN :from and :to';
      params.ExpressionAttributeValues = {
        ':from': { S: from },
        ':to': { S: to },
      };
    }
  } else {
    params.ExpressionAttributeValues = {
      ':from': { S: getStartOfWeek(new Date()) },
      ':to': { S: getEndOfWeek(new Date()) },
    };
  }

  // Filter by user
  const usersArr = [];
  if (Object.keys(users).length) {
    Object.keys(users).forEach((key) => {
      usersArr.push(`:${key}`);
      params.ExpressionAttributeValues[`:${key}`] = { S: users[key] };
    });
    params.FilterExpression += ` and #u IN (${usersArr.join(', ')})`;
  }

  req.dynamoInstance.scan(params, (err, data) => {
    if (err) {
      res.status(503).send({ error: err, message: 'Error with dynamo' });
    } else {
      graphData.people = getHowManyPeople(data.Items);
      countEmotions(data.Items);
      getPercentage(data.Items);

      res.status(200).send(graphData);
    }
  });
}

function getHRMoods(req, res) {
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'dateIndex',
    ProjectionExpression: '#d, #u, #msg, #mood',
    KeyConditionExpression: '#t = :m',
    ExpressionAttributeNames: {
      '#d': 'date',
      '#u': 'user',
      '#msg': 'message',
      '#mood': 'mood',
      '#t': 'type',
    },
    ExpressionAttributeValues: {
      ':m': 'moods',
    },
    ScanIndexForward: false,
  };
  const {
    from, to, limit, ...users
  } = req.query;
  // params.Limit = limit ? parseInt(limit, 10) + 1 : 25;

  // Date Filter
  if (from !== '0' || to !== '0') {
    if (from && to === '0') {
      params.KeyConditionExpression += ' and #d >= :from';
      params.ExpressionAttributeValues[':from'] = from;
    } else if (to && from === '0') {
      params.KeyConditionExpression += ' and #d <= :to';
      params.ExpressionAttributeValues[':to'] = to;
    } else if (from !== '0' && to !== '0') {
      params.KeyConditionExpression += ' and #d BETWEEN :from and :to';
      params.ExpressionAttributeValues[':from'] = from;
      params.ExpressionAttributeValues[':to'] = to;
    }
  } else {
    params.KeyConditionExpression += ' and #d BETWEEN :from and :to';
    params.ExpressionAttributeValues = {
      ':m': 'moods',
      ':from': getStartOfWeek(new Date()),
      ':to': getEndOfWeek(new Date()),
    };
  }

  // Filter by user
  if (Object.keys(users).length) {
    Object.keys(users).forEach((key, index) => {
      if (index === 0) {
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


function newMood(req, res) {
  const params = {
    TableName: TABLE_NAME,
    Item: {
      user: getUser(req),
      id: uuid(),
      date: Date.now().toString(),
      mood: req.body.selectedMood,
      type: 'moods',

    },
  };
  const { message } = req.body;
  if (message) {
    params.Item.message = message;
  }

  req.documentClient.put(params, (err, data) => {
    if (err) {
      res.status(503).send({ data: err, message: 'Error with dynamo' });
    } else {
      res.status(200).send({
        data,
        message: 'Element inserted correctly!',
      });
    }
  });
}

module.exports = {
  getHRMoods, getLastMood, getMoods, newMood,
};
