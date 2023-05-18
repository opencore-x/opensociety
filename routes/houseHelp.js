const express = require('express');
const HouseHelp = require('../models/houseHelp');
const router = express.Router();

// return all house helps
router.get('/', async (req, res) => {
  const houseHelp = await HouseHelp.find();
  res.status(200).send(houseHelp);
});

// return a particular house help
router.get('/:id', async (req, res) => {
  try {
    const houseHelp = await HouseHelp.findById(req.params.id);
    if (!houseHelp) res.status(404).send('house help not found');
    res.status(200).send(houseHelp);
  } catch (err) {
    res.status(500).send(err);
  }
});

// add a new house help
router.post('/', async (req, res) => {
  let houseHelp = new HouseHelp({
    name: req.body.name,
    phone: req.body.phone,
    worksAt: req.body.worksAt,
    duties: req.body.duties,
  });

  houseHelp = await houseHelp.save();
  res.status(200).send(houseHelp);
});

module.exports = router;
