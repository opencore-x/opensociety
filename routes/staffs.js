const router = require('express').Router();
const { Staff, joiSchema } = require('../models/Staff');
const validate = require('../middleware/validate');

router.get('/', async (req, res) => {
  const staffs = await Staff.find();
  res.status(200).json(staffs);
});

router.get('/:id', validate('id'), async (req, res) => {
  const staff = await Staff.findById(req.params);
  if (!staff) return res.status(400).json({ message: 'staff with given id does not exist' });
  res.status(200).json(staff);
});

router.post('/', validate(joiSchema), async (req, res) => {
  let staff = await Staff.findOne({ email: req.body.email });
  if (staff) return res.status(400).json({ message: 'staff already exists' });
  staff = new Staff(req.body);
  await staff.save();
  res.status(200).json(staff);
});

router.put('/:id', validate('id'), validate(joiSchema), async (req, res) => {
  const staff = await Staff.findByIdAndUpdate(req.params, req.body, { new: true });
  if (!staff) return res.status(404).json({ message: 'staff with the provided id does not exist' });
  res.status(200).json(staff);
});

router.delete('/:id', validate('id'), async (req, res) => {
  const staff = await Staff.findByIdAndRemove(req.params);
  if (!staff) return res.status(404).json({ message: 'staff with the provided id does not exist' });
  res.status(200).json(staff);
});

module.exports = router;

// todo: omit password before returning staff object to client
// fix status(400) message throughout the application
