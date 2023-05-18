const express = require('express');
const Visitor = require('../models/visitors');

const router = express.Router();

router.get('/', async (req, res) => {
  res.status().send();
});

router.get('/:id', async (req, res) => {
  res.status().send();
});

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
