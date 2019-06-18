const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN_MGMT;
const CLIENT_ID = process.env.CLIENT_ID_MGMT;
const CLIENT_SECRET = process.env.CLIENT_SECRET_MGMT;
const AUDIENCE = process.env.AUDIENCE_MGMT;

const getMgmtTokenOptions = {
  method: 'POST',
  url: `${AUTH0_DOMAIN}/oauth/token`,
  headers: { 'content-type': 'application/json' },
  body: `{"client_id":"${CLIENT_ID}","client_secret":"${CLIENT_SECRET}","audience":"${AUDIENCE}","grant_type":"client_credentials"}`,
};

function getFilteredUsersOptions(MGMT_TOKEN) {
  return {
    method: 'GET',
    url: `${AUTH0_DOMAIN}/api/v2/users`,
    qs: {
      q: 'name:*',
      search_engine: 'v3',
    },
    headers: { authorization: `Bearer ${MGMT_TOKEN}` },
  };
}

module.exports = { getFilteredUsersOptions, getMgmtTokenOptions };
