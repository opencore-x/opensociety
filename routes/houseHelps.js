const express = require('express');
const { HouseHelp, validate } = require('../models/HouseHelp');

const router = express.Router();

// return all house helps
router.get('/', async (req, res) => {
  const houseHelp = await HouseHelp.find();
  res.status(200).send(houseHelp);
});

// return a particular house help
router.get('/:id', async (req, res) => {
  const { value, error } = validate({ body: null, id: req.params.id });
  if (error) return res.status(400).send(error.details[0].message);

  const houseHelp = await HouseHelp.findById(req.params.id);
  if (!houseHelp) return res.status(404).send('house help not found');
  res.status(200).send(houseHelp);
});

// add a new house help
router.post('/', async (req, res) => {
  const { value, error } = validate({ body: req.body, id: null });
  if (error) return res.status(400).send(error.details[0].message);

  const houseHelp = new HouseHelp(value);
  await houseHelp.save();
  res.status(200).send(houseHelp);
});

// update house help details
router.put('/:id', async (req, res) => {
  const { value, error } = validate({ body: req.body, id: req.params.id });
  if (error) return res.status(400).send(error.details[0].message);

  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).send('invalid object id');

  const houseHelp = await HouseHelp.findByIdAndUpdate(req.params.id, value, {
    new: true,
  });
  if (!houseHelp) return res.status(404).send('house help not found');
  res.status(200).send(houseHelp);
});

// delete house help
router.delete('/:id', async (req, res) => {
  const { value, error } = validate({ body: null, id: req.params.id });
  if (error) return res.status(400).send(error.details[0].message);

  const houseHelp = await HouseHelp.findByIdAndDelete(req.params.id);
  if (!houseHelp) return res.status(404).send('house help not found');
  res.status(200).send(houseHelp);
});

module.exports = router;
