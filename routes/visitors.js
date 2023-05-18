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

// update a visitor
router.put('/:id', async (req, res) => {
  try {
    let visitor = await Visitor.findById(req.params.id);
    if (!visitor) res.status(404).send('visitor not found');

    visitor.name = req.body.name;
    visitor.phone = req.body.phone;
    visitor.hasVehicle = req.body.hasVehicle;
    visitor.vehicleType = req.body.vehicleType;
    visitor.vehicleNumber = req.body.vehicleNumber;
    visitor.visiting = req.body.visiting;

    visitor = await visitor.save();
    res.status(500).send(visitor);
  } catch (err) {
    res.status(500).send(err);
  }
});

router.delete('/:id', async (req, res) => {
  res.status().send();
});

module.exports = router;
