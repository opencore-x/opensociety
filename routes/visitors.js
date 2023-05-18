const express = require('express');
const Visitor = require('../models/visitors');

const router = express.Router();

// get all the visitors
router.get('/', async (req, res) => {
  const visitors = await Visitor.find();
  res.status(200).send(visitors);
});

// get a visitor
router.get('/:id', async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (visitor) res.status(200).send(visitor);
    res.status(404).send('incorrect ID');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// add a visitor
router.post('/', async (req, res) => {
  let visitor = new Visitor({
    name: req.body.name,
    phone: req.body.phone,
    hasVehicle: req.body.hasVehicle,
    vehicleType: req.body.vehicleType,
    vehicleNumber: req.body.vehicleNumber,
    visiting: req.body.visiting,
  });
  visitor = await visitor.save();
  res.status(200).send(visitor);
});

router.put('/:id', async (req, res) => {
  res.status().send();
});

router.delete('/:id', async (req, res) => {
  res.status().send();
});

module.exports = router;
