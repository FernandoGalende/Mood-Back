const jwtDecode = require('jwt-decode');
const emotions = require('../emotions');

function getUser(req) {
  if (!req.body.anonymous) {
    return jwtDecode(req.body.id_token).sub.split('|')[2];
  }
  return 'anonymous';
}

function checkMoodIntegrity(req, res, next) {
  const { selectedMood } = req.body;
  if (!selectedMood || !emotions.find(element => element.id === selectedMood)) {
    res
      .status(400)
      .send({ errMsg: 'Selected mood not received, or not valid!' });
  } else {
    next();
  }
}

function checkEnv(environments) {
  const correct = environments.filter(
    environment => process.env[environment] !== undefined,
  );
  if (correct.length !== environments.length) {
    console.log(
      'These are the environments missing:',
      environments.filter(environment => !correct.includes(environment)),
    );
    process.exit();
  }
}

function checkKudoIntegrity(req, res, next) {
  const { message, to } = req.body;
  if (to === [] || message === undefined) {
    res.status(503).send({ errMsg: 'To users are not defined' });
  } else {
    next();
  }
}

function checkAnonTokenValidity(req, res, next) {
  const { token } = req.params;
  const regex = /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
  if (!token || !regex.test(token)) {
    res.status(400).send({ msg: 'Invalid anonymous token' });
  } else {
    next();
  }
}

function checkHrGroup(req, res, next) {
  let { idtoken: idToken } = req.headers;
  if (idToken) {
    idToken = jwtDecode(idToken);
  } else {
    res.status(400).send({ msg: 'id token not found in headers' });
    return;
  }

  const { groups } = idToken['https://mood.payvision.app/'];
  if (groups && groups.includes('HR')) {
    next();
  } else {
    res.status(403).send({ msg: 'You do not belong to HR' });
  }
}

function checkUser(req, res, next) {
  const { user } = req.query;
  let { idtoken: idToken } = req.headers;
  if (idToken) {
    idToken = jwtDecode(idToken);
  } else {
    res.status(400).send({ msg: 'id token not found in headers' });
    return;
  }

  const email = idToken.sub.split('|')[2];
  if (email === user) {
    next();
  } else {
    res
      .status(403)
      .send({ msg: 'You are not authorized to view these messages!' });
  }
}

module.exports = {
  checkAnonTokenValidity,
  checkHrGroup,
  checkKudoIntegrity,
  getUser,
  checkMoodIntegrity,
  checkEnv,
  checkUser,
};
