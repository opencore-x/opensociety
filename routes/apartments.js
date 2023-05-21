const express = require('express');
const { Apartment, validateApartment } = require('../models/apartments');

const router = express.Router();

// get all apartments
router.get('/', async (req, res) => {
  const apartment = await Apartment.find();
  res.status(200).send(apartment);
});

// get an apartment
router.get('/:id', async (req, res) => {
  try {
    const apartment = await Apartment.findById(req.params.id);
    if (!apartment) return res.status(404).send('not apartment found');
    res.status(200).send(apartment);
  } catch (error) {
    res.status(500).send(error);
  }
});

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

  apartment = new Apartment(value);
  apartment = await apartment.save();
  res.status(200).send(apartment);
});

// update an apartment
router.put('/:id', async (req, res) => {
  let apartment = {
    name: req.body.name,
    owner: req.body.owner,
    tenant: req.body.tenant,
    occupants: req.body.occupants,
  };

  const { value, error } = validateApartment(apartment);
  if (error) return res.status(500).send(error.details[0].message);
  try {
    apartment = await Apartment.findByIdAndUpdate(req.params.id, value, { new: true });
    if (!apartment) return res.status(404).send('apartment not found');
    res.status(200).send(apartment);
  } catch (error) {
    res.status(500).send(error);
  }
});

// delete an apartment
router.delete('/:id', async (req, res) => {
  try {
    const apartment = await Apartment.findByIdAndRemove(req.params.id);
    if (!apartment) return res.status(200).send('apartment not found');
    res.status(200).send(apartment);
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = router;
