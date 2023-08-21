const router = require('express').Router();
const bcrypt = require('bcrypt');
const { SecurityGuard, joiSchema } = require('../models/SecurityGuard');
const validate = require('../middleware/validate');

// get all security guard
router.get('/', async (req, res) => {
  const securityGuard = await SecurityGuard.find();
  res.status(200).json(securityGuard);
});

// get a security guard
router.get('/:id', validate('id'), async (req, res) => {
  const securityGuard = await SecurityGuard.findById(req.params.id);
  if (!securityGuard) return res.status(404).json({ message: 'security guard not found' });
  res.status(200).json(securityGuard);
});

// add new security guard
router.post('/', validate(joiSchema), async (req, res) => {
  // encrypt password
  req.body.password = await bcrypt.hash(req.body.password, 10);
  const securityGuard = new SecurityGuard(req.body);
  await securityGuard.save();
  res.status(200).json(securityGuard);
});

// update security guard
router.put('/:id', validate('id'), validate(joiSchema), async (req, res) => {
  const securityGuard = await SecurityGuard.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!securityGuard) return res.status(404).json({ message: 'no security guard found' });
  res.status(200).json(securityGuard);
});

// delete security guard
router.delete('/:id', validate('id'), async (req, res) => {
  const securityGuard = await SecurityGuard.findByIdAndRemove(req.params.id);
  if (!securityGuard) return res.status(404).json({ message: 'no security guard found' });
  res.status(200).json(securityGuard);
});

module.exports = router;

// todo:
// add password encryption
