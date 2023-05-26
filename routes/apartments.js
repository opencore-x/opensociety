const express = require('express');
const { Apartment, validate } = require('../models/apartments');

const router = express.Router();

// get all apartments
router.get('/', async (req, res) => {
  const apartment = await Apartment.find();
  res.status(200).send(apartment);
});

// get an apartment
router.get('/:id', async (req, res) => {
  const { value, error } = validate({ body: req.body, id: req.params.id });
  if (error) return res.status(400).send(error.details[0].message);

  const apartment = await Apartment.findById(req.params.id);
  if (!apartment) return res.status(404).send('apartment not found');
  res.status(200).send(apartment);
});

// add a new aparatment
router.post('/', async (req, res) => {
  const { value, error } = validate({ body: req.body, id: req.params.id });
  if (error) return res.status(400).send(error.details[0].message);

  const apartment = new Apartment(value);
  await apartment.save();
  res.status(200).send(apartment);
});

// update an apartment
router.put('/:id', async (req, res) => {
  const { value, error } = validate({ body: req.body, id: req.params.id });
  if (error) return res.status(500).send(error.details[0].message);

  const apartment = await Apartment.findByIdAndUpdate(req.params.id, value, { new: true });
  if (!apartment) return res.status(404).send('apartment not found');
  res.status(200).send(apartment);
});

// delete an apartment
router.delete('/:id', async (req, res) => {
  const { value, error } = validate({ body: req.body, id: req.params.id });
  if (error) return res.status(400).send(error.details[0].message);

  const apartment = await Apartment.findByIdAndRemove(req.params.id);
  if (!apartment) return res.status(200).send('apartment not found');
  res.status(200).send(apartment);
});

module.exports = router;
