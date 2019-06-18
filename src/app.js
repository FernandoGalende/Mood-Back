const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const checkJwt = require('./auth');
const routes = require('./routes/routes.js');
const { checkEnv } = require('./routes/utils.js');

const app = express();

checkEnv(['AUDIENCE_AUTH0',
  'ISSUER_AUTH0',
  'JWKS_URI',
  'GENERAL_MOOD_TABLE',
  'SUGGESTIONS_MOOD_TABLE',
  'KUDOS_TABLE',
  'AUTH0_DOMAIN_MGMT',
  'CLIENT_ID_MGMT',
  'CLIENT_SECRET_MGMT',
  'AUDIENCE_MGMT',
  'USERS_TABLE']);

// Auth0 middleware
app.use(checkJwt);

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

routes(app);

app.listen(3000, () => console.log('app running on port 3000'));
