const express = require('express');
const { residents, validateResident, Resident } = require('../models/residents');
const router = express.Router();

// add a new resident
router.post('/', async (req, res) => {
  let resident = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    dob: req.body.dob,
    gender: req.body.gender,
    phone: req.body.phone,
    email: req.body.email,
    apartment: req.body.apartment,
    status: req.body.status,
    nationality: req.body.nationality,
  };

  const { value, error } = validateResident(resident);
  if (error) return res.status(500).send(error.details[0].message);
  resident = new Resident(value);
  resident = await resident.save();
  res.status(200).send(resident);
});

module.exports = router;
