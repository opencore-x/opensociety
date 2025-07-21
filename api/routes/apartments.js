const router = require('express').Router();
const { Apartment, joiSchema } = require('../models/Apartment');
const validate = require('../middleware/validate');

// get all apartments
router.get('/', async (req, res) => {
  const apartment = await Apartment.find();
  res.status(200).json({ apartment });
});

// get an apartment
router.get('/:id', validate('id'), async (req, res) => {
  const apartment = await Apartment.findById(req.params.id);
  if (!apartment) return res.status(404).json({ message: 'apartment not found' });
  res.status(200).json(apartment);
});

// add a new apartment
router.post('/', validate(joiSchema), async (req, res) => {
  const apartmentName = req.body.tower + req.body.apartmentNo;
  let apartment = await Apartment.findOne({ name: apartmentName });
  if (apartment) return res.status(400).json({ message: 'Apartment already exists' });
  apartment = new Apartment(req.body);
  await apartment.save();
  res.status(200).json(apartment);
});

// update an apartment
router.put('/:id', validate('id'), validate(joiSchema), async (req, res) => {
  const apartment = await Apartment.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!apartment) return res.status(404).json({ message: 'apartment not found' });
  res.status(200).json(apartment);
});

// delete an apartment
router.delete('/:id', validate('id'), async (req, res) => {
  const apartment = await Apartment.findByIdAndRemove(req.params.id);
  if (!apartment) return res.status(200).json({ message: 'apartment not found' });
  res.status(200).json(apartment);
});

module.exports = router;
