const express = require('express');
const { SecurityGuard, validateSecurityGuard } = require('../models/securityGuards');
const router = express.Router();

// get all security guard
router.get('/', async (req, res) => {
  const securityGuard = await SecurityGuard.find();
  res.status(200).send(securityGuard);
});

// get a security guard
router.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).send('invalid object id');
  const securityGuard = await SecurityGuard.findById(req.params.id);
  if (!securityGuard) return res.status(404).send('security guard not found');
  res.status(200).send(securityGuard);
});

// add new security guard
router.post('/', async (req, res) => {
  const { value, error } = validateSecurityGuard(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  const securityGuard = new SecurityGuard(value);
  await securityGuard.save();
  res.status(200).send(securityGuard);
});

// update security guard
router.put('/:id', async (req, res) => {
  const { value, error } = validateSecurityGuard(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).send('invalid object id');

  const securityGuard = await SecurityGuard.findByIdAndUpdate(req.params.id, value, { new: true });
  if (!securityGuard) return res.status(404).send('no security guard found');
  res.status(200).send(securityGuard);
});

// delete security guard
router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).send('invalid object id');
  const securityGuard = await SecurityGuard.findByIdAndRemove(req.params.id);
  if (!securityGuard) return res.status(404).send('no security guard found');
  res.status(200).send(securityGuard);
});

module.exports = router;

// todo:
// add password encryption
