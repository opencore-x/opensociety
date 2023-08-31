const router = require('express').Router();
const _ = require('lodash');
const { Staff, joiSchema } = require('../models/Staff');
const validate = require('../middleware/validate');

const sendStaff = (res, staff) => {
  const staff = _.omit(staff.toObject(), ['password']);
  res.status(200).json(staff);
};

const NotFoundResponse = (res) => res.status(404).json({ message: 'staff with given id does not exist' });

router.get('/', async (req, res) => {
  const staffs = await Staff.find();
  res.status(200).json({ staffs });
});

router.get('/:id', validate('id'), async (req, res) => {
  const staff = await Staff.findById(req.params);
  if (!staff) return NotFoundResponse(res);
  sendStaff(res, staff);
});

router.post('/', validate(joiSchema), async (req, res) => {
  let staff = await Staff.findOne({ email: req.body.email });
  if (staff) return res.status(400).json({ message: 'staff already exists' });
  staff = new Staff(req.body);
  await staff.save();
  sendStaff(res, staff);
});

router.put('/:id', validate('id'), validate(joiSchema), async (req, res) => {
  const staff = await Staff.findByIdAndUpdate(req.params, req.body, { new: true });
  if (!staff) return NotFoundResponse(res);
  sendStaff(res, staff);
});

router.delete('/:id', validate('id'), async (req, res) => {
  const staff = await Staff.findByIdAndRemove(req.params);
  if (!staff) return NotFoundResponse(res);
  sendStaff(res, staff);
});

module.exports = router;

// todo: omit password when getting all staff
// fix status(400) message throughout the application
