const { dynamo } = require('../db');
const {
  getHRMoods, getLastMood, getMoods, newMood,
} = require('./mood');
const {
  getAnonSuggestionById,
  getSuggestions,
  getSuggestionsFromUser,
  modifySuggestion,
  newSuggestion,
  deleteSuggestion,
} = require('./suggestions');
const {
  getKudos, newKudos, getNotifications, removeNotification,
} = require('./kudos');

const { getRecommendations, getSingleUser, userExists } = require('./users');
const {
  checkAnonTokenValidity, checkHrGroup, checkKudoIntegrity, checkMoodIntegrity, checkUser,
} = require('./utils');

const appRouter = (app) => {
  app.post('/userExists', dynamo, (req, res) => userExists(req, res));

  app.post('/mood', dynamo, checkMoodIntegrity, (req, res) => newMood(req, res));

  app.get('/mood', dynamo, (req, res) => getMoods(req, res));

  app.get('/moods/last', dynamo, (req, res) => getLastMood(req, res));

  app.get('/hr/moods', checkHrGroup, dynamo, (req, res) => getHRMoods(req, res));

  app.post('/suggestions', dynamo, (req, res) => newSuggestion(req, res));

  app.get('/suggestions', checkHrGroup, dynamo, (req, res) => getSuggestions(req, res));

  app.get('/suggestions/user', checkUser, dynamo, (req, res) => getSuggestionsFromUser(req, res));

  app.get('/suggestions/:token', checkAnonTokenValidity, dynamo, (req, res) => getAnonSuggestionById(req, res));

  app.put('/suggestions', dynamo, (req, res) => modifySuggestion(req, res));

  app.delete('/suggestions/:id', dynamo, (req, res) => deleteSuggestion(req, res));

  app.post('/kudos', dynamo, checkKudoIntegrity, (req, res) => newKudos(req, res));

  app.get('/kudos', dynamo, (req, res) => getKudos(req, res));

  app.get('/kudos/notifications', dynamo, (req, res) => getNotifications(req, res));

  app.delete('/kudos/:index', dynamo, (req, res) => removeNotification(req, res));

  app.get('/users', dynamo, (req, res) => getRecommendations(req, res));

  app.get('/user/:email', dynamo, (req, res) => getSingleUser(req, res));
};

module.exports = appRouter;
