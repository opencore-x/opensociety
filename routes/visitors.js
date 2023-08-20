const router = require('express').Router();
const { Visitor, joiSchema } = require('../models/Visitor');
const validate = require('../middleware/validate');

// get all the visitors
router.get('/', async (req, res) => {
  const visitors = await Visitor.find();
  res.status(200).send(visitors);
});

// get a visitor
router.get('/:id', validate('id'), async (req, res, next) => {
  const visitor = await Visitor.findById(req.params.id);
  if (!visitor) return res.status(404).send('incorrect ID');
  res.status(200).send(visitor);
});

// add a visitor
router.post('/', validate(joiSchema), async (req, res) => {
  const visitor = new Visitor(req.body);
  await visitor.save();
  res.status(200).send(visitor);
});

// update a visitor
router.put('/:id', validate('id'), validate(joiSchema), async (req, res, next) => {
  const visitor = await Visitor.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!visitor) return res.status(404).send('visitor not found');
  res.status(500).send(visitor);
});

// delete a visitor
router.delete('/:id', validate('id'), async (req, res) => {
  const visitor = await Visitor.findByIdAndRemove(req.params.id);
  if (!visitor) return res.status(404).send('visitor not found');
  res.status(200).send(visitor);
});

module.exports = router;

// Todo
// add regex to the phone number
