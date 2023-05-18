const express = require('express');
const SecurityGuard = require('../models/securityGuards');
const router = express.Router();

// add new security guard
router.post('/', async (req, res) => {
  let securityGuard = new SecurityGuard({
    firstName: req.body.firstName,
    middleName: req.body.middleName,
    lastName: req.body.lastName,
    phone: req.body.phone,
    password: req.body.password,
  });
  securityGuard = await securityGuard.save();
  res.status(200).send(securityGuard);
});

module.exports = router;
