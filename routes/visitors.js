const express = require('express');
const { Visitor, validateVisitor } = require('../models/visitors');

const router = express.Router();

// get all the visitors
router.get('/', async (req, res) => {
  const visitors = await Visitor.find();
  res.status(200).send(visitors);
});

// get a visitor
router.get('/:id', async (req, res, next) => {
  const visitor = await Visitor.findById(req.params.id);
  if (!visitor) return res.status(404).send('incorrect ID');
  res.status(200).send(visitor);
});

// add a visitor
router.post('/', async (req, res) => {
  console.log('in the block');

  let visitor = {
    name: req.body.name,
    phone: req.body.phone,
    hasVehicle: req.body.hasVehicle,
    vehicleType: req.body.vehicleType,
    vehicleNumber: req.body.vehicleNumber,
    visiting: req.body.visiting,
  };
  const { value, error } = validateVisitor(visitor);
  if (error) return res.status(500).send(error.details[0].message);

  visitor = new Visitor(value);
  await visitor.save();
  res.status(200).send(visitor);
});

// update a visitor
router.put('/:id', async (req, res, next) => {
  let visitor = {
    name: req.body.name,
    phone: req.body.phone,
    hasVehicle: req.body.hasVehicle,
    vehicleType: req.body.vehicleType,
    vehicleNumber: req.body.vehicleNumber,
    visiting: req.body.visiting,
  };

  const { value, error } = validateVisitor(visitor);
  if (error) return res.status(500).send(error.details[0].message);

  visitor = await Visitor.findByIdAndUpdate(req.params.id, value, {
    new: true,
  });
  if (!visitor) return res.status(404).send('visitor not found');
  res.status(500).send(visitor);
});

// delete a visitor
router.delete('/:id', async (req, res) => {
  const visitor = await Visitor.findByIdAndRemove(req.params.id);
  if (!visitor) res.status(404).send('visitor not found');
  res.status(200).send(visitor);
});

module.exports = router;

// Todo
// add regex to the phone number
