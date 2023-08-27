const router = require('express').Router();
const _ = require('lodash');
const { Resident, joiSchema } = require('../models/Resident');
const validate = require('../middleware/validate');

const sendOkResponse = (res, resident) => {
  const resident = _.omit(resident.toObject(), ['password']);
  res.status(200).json(resident);
};

const notFoundResponse = (res) => res.status(404).json({ message: 'resident with given id did not found' });

// get all the residents
router.get('/', async (req, res) => {
  const resident = await Resident.find();
  res.status(200).json(resident);
});

// get a resident
router.get('/:id', validate('id'), async (req, res) => {
  const resident = await Resident.findById(req.params.id);
  if (!resident) return notFoundResponse(res);
  sendOkResponse(res, resident);
});

// add a new resident
router.post('/', validate(joiSchema), async (req, res) => {
  let resident = await Resident.findOne({ email: req.body.email });
  if (resident) return res.status(400).json({ message: 'Resident with this email already exists' });
  resident = new Resident(req.body);
  await resident.save();
  sendOkResponse(res, resident);
});

// edit a resident
router.put('/:id', validate('id'), validate(joiSchema), async (req, res) => {
  const resident = await Resident.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!resident) return notFoundResponse(res);
  sendOkResponse(res, resident);
});

// delete a resident
router.delete('/:id', validate('id'), async (req, res) => {
  const resident = await Resident.findByIdAndRemove(req.params.id);
  if (!resident) return notFoundResponse(res);
  sendOkResponse(res, resident);
});

module.exports = router;
