const router = require('express').Router();
const _ = require('lodash');
const bcrypt = require('bcrypt');
const { SecurityGuard, joiSchema } = require('../models/SecurityGuard');
const validate = require('../middleware/validate');

const notFoundResponse = (res) =>
  res.status(404).json({ message: 'security guard with the given id was not found' });

const sendOkResponse = (res, securityGuard) => {
  const securityGuardWithoutPassword = _.omit(securityGuard.toObject(), ['password']);
  res.status(200).json(securityGuardWithoutPassword);
};

// get all security guard
router.get('/', async (req, res) => {
  const securityGuard = await SecurityGuard.find();
  res.status(200).json({ securityGuard });
});

// get a security guard
router.get('/:id', validate('id'), async (req, res) => {
  const securityGuard = await SecurityGuard.findById(req.params.id);
  if (!securityGuard) return notFoundResponse(res);
  sendOkResponse(res, securityGuard);
});

// add new security guard
router.post('/', validate(joiSchema), async (req, res) => {
  let securityGuard = await SecurityGuard.findOne({ phone: req.body.phone });
  if (securityGuard)
    return res.status(400).json({ message: 'security guard with this phone no. already exist' });
  // encrypt password
  req.body.password = await bcrypt.hash(req.body.password, 10);
  securityGuard = new SecurityGuard(req.body);
  await securityGuard.save();
  sendOkResponse(res, securityGuard);
});

// update security guard
router.put('/:id', validate('id'), validate(joiSchema), async (req, res) => {
  const securityGuard = await SecurityGuard.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!securityGuard) return notFoundResponse(res);
  sendOkResponse(res, securityGuard);
});

// delete security guard
router.delete('/:id', validate('id'), async (req, res) => {
  const securityGuard = await SecurityGuard.findByIdAndRemove(req.params.id);
  if (!securityGuard) return notFoundResponse(res);
  sendOkResponse(res, securityGuard);
});

module.exports = router;
