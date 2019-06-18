const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');

const audience = process.env.AUDIENCE_AUTH0;
const jwksUri = process.env.JWKS_URI;
const issuer = process.env.ISSUER_AUTH0;

const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri,
  }),
  audience,
  issuer,
  algorithms: ['RS256'],
});

module.exports = checkJwt;
