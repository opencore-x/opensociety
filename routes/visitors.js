const router = require('express').Router();
const { Visitor, joiSchema } = require('../models/Visitor');
const validate = require('../middleware/validate');

// get all the visitors
router.get('/', async (req, res) => {
  const visitors = await Visitor.find();
  res.status(200).json(visitors);
});

// get a visitor
router.get('/:id', validate('id'), async (req, res, next) => {
  const visitor = await Visitor.findById(req.params.id);
  if (!visitor) return res.status(404).json({ message: 'incorrect ID' });
  res.status(200).json(visitor);
});

// add a visitor
router.post('/', validate(joiSchema), async (req, res) => {
  const visitor = new Visitor(req.body);
  await visitor.save();
  res.status(200).json(visitor);
});

// update a visitor
router.put('/:id', validate('id'), validate(joiSchema), async (req, res, next) => {
  const visitor = await Visitor.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!visitor) return res.status(404).json({ message: 'visitor not found' });
  res.status(200).json(visitor);
});

// delete a visitor
router.delete('/:id', validate('id'), async (req, res) => {
  const visitor = await Visitor.findByIdAndRemove(req.params.id);
  if (!visitor) return res.status(404).json({ message: 'visitor not found' });
  res.status(200).json(visitor);
});

module.exports = router;

// Todo
// add regex to the phone number
