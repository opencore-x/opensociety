const express = require('express');
const { Apartment, validateApartment } = require('../models/apartments');

const router = express.Router();

// add a new aparatment
router.post('/', async (req, res) => {
  let apartment = {
    name: req.body.name,
    owner: req.body.owner,
    tenant: req.body.tenant,
    occupants: req.body.occupants,
  };

  const { value, error } = validateApartment(apartment);
  if (error) return res.status(500).send(error.details[0].message);

  apartment = await new Apartment(value);
  res.status(200).send(apartment);
});

module.exports = router;
