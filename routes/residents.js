const router = require('express').Router();
const { Resident, joiSchema } = require('../models/Resident');
const validate = require('../middleware/validate');

// get all the residents
router.get('/', async (req, res) => {
  const resident = await Resident.find();
  res.status(200).json(resident);
});

// get a resident
router.get('/:id', validate('id'), async (req, res) => {
  const resident = await Resident.findById(req.params.id);
  if (!resident) return res.status(404).json({ message: 'resident not found' });
  res.status(200).json(resident);
});

// add a new resident
router.post('/', validate(joiSchema), async (req, res) => {
  const resident = new Resident(req.body);
  await resident.save();
  res.status(200).json(resident);
});

// edit a resident
router.put('/:id', validate('id'), validate(joiSchema), async (req, res) => {
  const resident = await Resident.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!resident) return res.status(404).json({ message: 'resident not found' });
  res.status(200).json(resident);
});

// delete a resident
router.delete('/:id', validate('id'), async (req, res) => {
  const resident = await Resident.findByIdAndRemove(req.params.id);
  if (!resident) return res.status(404).json({ message: 'resident not found' });
  res.status(200).json(resident);
});

module.exports = router;
