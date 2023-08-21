const router = require('express').Router();
const { HouseHelp, joiSchema } = require('../models/HouseHelp');
const validate = require('../middleware/validate');

// return all house helps
router.get('/', async (req, res) => {
  const houseHelp = await HouseHelp.find();
  res.status(200).json(houseHelp);
});

// return a particular house help
router.get('/:id', validate('id'), async (req, res) => {
  const houseHelp = await HouseHelp.findById(req.params.id);
  if (!houseHelp) return res.status(404).json({ message: 'house help not found' });
  res.status(200).json(houseHelp);
});

// add a new house help
router.post('/', validate(joiSchema), async (req, res) => {
  let houseHelp = HouseHelp.findOne({ phone: req.body.phone });
  if (houseHelp) return res.status(400).json('house help with this phone no. already exists');
  houseHelp = new HouseHelp(req.body);
  await houseHelp.save();
  res.status(200).json(houseHelp);
});

// update house help details
router.put('/:id', validate('id'), validate(joiSchema), async (req, res) => {
  const houseHelp = await HouseHelp.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!houseHelp) return res.status(404).json({ message: 'house help not found' });
  res.status(200).json(houseHelp);
});

// delete house help
router.delete('/:id', validate('id'), async (req, res) => {
  const houseHelp = await HouseHelp.findByIdAndDelete(req.params.id);
  if (!houseHelp) return res.status(404).json({ message: 'house help not found' });
  res.status(200).json(houseHelp);
});

module.exports = router;
