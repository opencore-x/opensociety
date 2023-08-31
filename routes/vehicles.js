const router = require('express').Router();
const { Vehicle, joiSchema } = require('../models/Vehicle');
const validate = require('../middleware/validate');

// vehicle not found error message response
const notFound = (res) => res.status(404).json({ message: 'vehicle with given id does not exist' });

router.get('/', async (req, res) => {
  const vehicles = await Vehicle.find();
  res.status(200).json({ vehicles });
});

router.get('/:id', validate('id'), async (req, res) => {
  const vehicle = await Vehicle.findById(req.body);
  if (!vehicle) return notFound(res);
  res.status(200).json(vehicle);
});

router.post('/', validate(joiSchema), async (req, res) => {
  let vehicle = await Vehicle.findOne({ vehicleNo: req.body.vehicleNo });
  if (vehicle) return res.status(400).json({ message: 'vehicle with this vehicle number already exists' });
  vehicle = new Vehicle(req.body);
  await vehicle.save();
  res.status(200).json(vehicle);
});

router.put('/:id', validate('id'), validate(joiSchema), async (req, res) => {
  const vehicle = await Vehicle.findByIdAndUpdate(req.params, req.body, { new: true });
  if (!vehicle) return notFound(res);
  res.status(200).json(vehicle);
});

router.delete('/:id', validate('id'), async (req, res) => {
  const vehicle = await Vehicle.findByIdAndRemove(req.params);
  if (!vehicle) return notFound(res);
  res.status(200).json(vehicle);
});

module.exports = router;

// todo: check if get in vehicles throw an error due to it being an array passed with json func
// brainstorm on searching vehicle based on id or vehicle no
