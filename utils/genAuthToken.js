const jwt = require('jsonwebtoken');

module.exports = function (user) {
  const payload = {
    _id: user._id,
    iat: new Date.getTime(),
  };

  const options = {
    subject: user.role,
    expiresIn: '24h',
    issuer: 'mysociety',
    audience: 'api.mysociety',
  };

  return jwt.sign(payload, process.env.JWT_PVT_KEY, options);
};
