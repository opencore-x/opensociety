const express = require('express');
const SecurityGuard = require('../models/securityGuards');
const router = express.Router();

// get a security guard
router.get('/:id', async (req, res) => {
  try {
    const securityGuard = await SecurityGuard.findById(req.params.id);
    if (!securityGuard) res.status(404).send('security guard not found');
    res.status(200).send(securityGuard);
  } catch (err) {
    res.status(500).send(err);
  }
});

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
