const router = require('express').Router();
const { Resident } = require('../models/Resident');
const { Staff } = require('../models/Staff');
const { SecurityGuard } = require('../models/SecurityGuard');
const genAuthToken = require('../utils/genAuthToken');
const bcrypt = require('bcrypt');

const unauthorizedResponse = (res) =>
  res.status(401).json({ message: 'username and password combination is incorrect' });

const sendOkResponse = (res, user) => {
  const token = genAuthToken(user);
  res.status(200).header('mysociety', token).json(user);
};

router.post('/resident', async (req, res) => {
  const resident = await Resident.findOne({ email: req.body.email });
  if (!resident) return unauthorizedResponse(res);

  const match = await bcrypt.compare(req.body.password, resident.password);
  if (!match) return unauthorizedResponse(res);

  sendOkResponse(res, resident);
});

router.post('/staff', async (req, res) => {
  const staff = await Staff.findOne({ email: req.body.email });
  if (!staff) return unauthorizedResponse(res);

  const match = await bcrypt.compare(req.body.password, staff.password);
  if (!match) return unauthorizedResponse(res);

  sendOkResponse(res, staff);
});

router.post('/security', async (req, res) => {
  const security = await SecurityGuard.findOne({ email: req.body.email });
  if (!security) return unauthorizedResponse(res);

  const match = await bcrypt.compare(req.body.password, security.password);
  if (!match) return unauthorizedResponse(res);

  sendOkResponse(res, security);
});

module.exports = router;

// check for router import in app.js
// add joiSchema for auth and validate
