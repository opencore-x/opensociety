const express = require('express');
const { Apartment, joiSchema } = require('../models/Apartment');
const validate = require('../middleware/validate');

const router = express.Router();

// get all apartments
router.get('/', async (req, res) => {
  const apartment = await Apartment.find();
  res.status(200).send(apartment);
});

// get an apartment
router.get('/:id', validate('id'), async (req, res) => {
  const apartment = await Apartment.findById(req.params.id);
  if (!apartment) return res.status(404).send('apartment not found');
  res.status(200).send(apartment);
});

// add a new aparatment
router.post('/', validate(joiSchema), async (req, res) => {
  const apartment = new Apartment(value);
  await apartment.save();
  res.status(200).send(apartment);
});

// update an apartment
router.put('/:id', validate('id'), validate(joiSchema), async (req, res) => {
  const apartment = await Apartment.findByIdAndUpdate(req.params.id, value, { new: true });
  if (!apartment) return res.status(404).send('apartment not found');
  res.status(200).send(apartment);
});

// delete an apartment
router.delete('/:id', validate('id'), async (req, res) => {
  const apartment = await Apartment.findByIdAndRemove(req.params.id);
  if (!apartment) return res.status(200).send('apartment not found');
  res.status(200).send(apartment);
});

module.exports = router;
