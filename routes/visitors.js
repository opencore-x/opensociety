const express = require('express');
const { Visitor, validate } = require('../models/visitors');

const router = express.Router();

// get all the visitors
router.get('/', async (req, res) => {
  const visitors = await Visitor.find();
  res.status(200).send(visitors);
});

// get a visitor
router.get('/:id', async (req, res, next) => {
  const { value, error } = validate({ body: null, id: req.params.id });
  if (error) return res.status(400).send(error.details[0].message);

  const visitor = await Visitor.findById(req.params.id);
  if (!visitor) return res.status(404).send('incorrect ID');
  res.status(200).send(visitor);
});

// add a visitor
router.post('/', async (req, res) => {
  const { value, error } = validate({ body: req.body, id: null });
  if (error) return res.status(400).send(error.details[0].message);

  const visitor = new Visitor(value);
  await visitor.save();
  res.status(200).send(visitor);
});

// update a visitor
router.put('/:id', async (req, res, next) => {
  const { value, error } = validate({ body: req.body, id: req.params.id });
  if (error) return res.status(400).send(error.details[0].message);

  const visitor = await Visitor.findByIdAndUpdate(req.params.id, value, {
    new: true,
  });
  if (!visitor) return res.status(404).send('visitor not found');
  res.status(500).send(visitor);
});

// delete a visitor
router.delete('/:id', async (req, res) => {
  const { value, error } = validate({ body: null, id: req.params.id });
  if (error) return res.status(400).send(error.details[0].message);

  const visitor = await Visitor.findByIdAndRemove(req.params.id);
  if (!visitor) return res.status(404).send('visitor not found');
  res.status(200).send(visitor);
});

module.exports = router;

// Todo
// add regex to the phone number
