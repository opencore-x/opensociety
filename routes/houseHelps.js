const express = require('express');
const { HouseHelp, validateHouseHelp } = require('../models/houseHelps');
const router = express.Router();

// return all house helps
router.get('/', async (req, res) => {
  const houseHelp = await HouseHelp.find();
  res.status(200).send(houseHelp);
});

// return a particular house help
router.get('/:id', async (req, res) => {
  const houseHelp = await HouseHelp.findById(req.params.id);
  if (!houseHelp) return res.status(404).send('house help not found');
  res.status(200).send(houseHelp);
});

// add a new house help
router.post('/', async (req, res) => {
  let houseHelp = {
    name: req.body.name,
    phone: req.body.phone,
    worksAt: req.body.worksAt,
    duties: req.body.duties,
  };

  const { value, error } = validateHouseHelp(houseHelp);
  if (error) return res.status(500).send(error.details[0].message);

  houseHelp = new HouseHelp(value);
  await houseHelp.save();
  res.status(200).send(houseHelp);
});

// update house help details
router.put('/:id', async (req, res) => {
  let houseHelp = {
    name: req.body.name,
    phone: req.body.phone,
    worksAt: req.body.worksAt,
    duties: req.body.duties,
  };

  const { value, error } = validateHouseHelp(houseHelp);
  if (error) return res.status(500).send(error.details[0].message);

  houseHelp = await HouseHelp.findByIdAndUpdate(req.params.id, value, {
    new: true,
  });
  if (!houseHelp) return res.status(404).send('house help not found');
  res.status(200).send(houseHelp);
});

// delete house help
router.delete('/:id', async (req, res) => {
  const houseHelp = await HouseHelp.findByIdAndDelete(req.params.id);
  if (!houseHelp) return res.status(404).send('house help not found');
  res.status(200).send(houseHelp);
});

module.exports = router;

// todo
// add fullname to househelp
