const jwtDecode = require('jwt-decode');

const TABLE_NAME = process.env.USERS_TABLE;

function translateUsersForClient(users) {
  if (Array.isArray(users)) {
    return users.reduce((acc, element) => {
      const newAcc = [
        ...acc,
        {
          email: element.email.toLowerCase(),
          name: `${element.name} ${element.lastName}`,
        },
      ];
      return newAcc;
    }, []);
  }
  return [];
}

function createUser(req, res) {
  const user = jwtDecode(req.body.id_token);

  const params = {
    TableName: TABLE_NAME,
    Item: {
      email: req.body.email.toLowerCase(),
      name: user.given_name,
      nameSlug: user.given_name.toLowerCase(),
      lastName: user.family_name,
      lastNameSlug: user.family_name.toLowerCase(),
      picture: user.picture,
      type: 'user',
      unread: [],
    },
  };
  req.documentClient.put(params, (err) => {
    if (err) {
      res.status(503).send();
    } else {
      res.status(200).send();
    }
  });
}

function getOrCreateUser(req, res) {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      email: req.body.email,
    },
  };
  req.documentClient.get(params, (err, data) => {
    if (err || !Object.keys(data).length) {
      createUser(req, res, TABLE_NAME);
    } else {
      res.status(200).send();
    }
  });
}

function userExists(req, res) {
  getOrCreateUser(req, res, TABLE_NAME);
}

function getSingleUser(req, res) {
  const params = {
    TableName: TABLE_NAME,
    ProjectionExpression: '#n, lastName, #t, email, picture',
    ExpressionAttributeNames: {
      '#n': 'name',
      '#t': 'type',
    },
    Key: {
      email: req.params.email,
    },
  };

  req.documentClient.get(params, (err, data) => {
    if (err) {
      res.status(503).send({ error: err, message: 'Error with dynamo' });
    } else {
      res.status(200).send({
        data,
        message: 'User fetched correctly',
      });
    }
  });
}

function getRecommendations(req, res) {
  const { filter } = req.query;
  const params = {
    TableName: TABLE_NAME,
  };

  if (filter) {
    params.FilterExpression = 'contains(#name, :filter) or contains(#lastname, :filter)';
    params.ExpressionAttributeNames = {
      '#name': 'nameSlug',
      '#lastname': 'lastNameSlug',
    };
    params.ExpressionAttributeValues = {
      ':filter': filter,
    };
  }


  req.documentClient.scan(params, (err, data) => {
    if (err) {
      res.status(503).send({ error: err, message: 'Error with dynamo' });
    } else {
      res.status(200).send({
        data: translateUsersForClient(data.Items),
        message: 'Users fetched correctly',
      });
    }
  });
}

module.exports = { getRecommendations, getSingleUser, userExists };
