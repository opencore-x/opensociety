const router = require('express').Router();
const validate = require('../middleware/validate');
const { ClubhouseMember, joiSchema } = require('../models/ClubhouseMember');

const notFoundResponse = (res) =>
  res.status(404).json({ message: 'clubhouse member with given it does not exist' });

router.get('/', async (req, res) => {
  const clubhouseMembers = await ClubhouseMember.find();
  res.status(200).json({ clubhouseMembers });
});

router.get('/:id', validate('id'), async (req, res) => {
  const clubhouseMember = await ClubhouseMember.findById(req.params);
  if (!clubhouseMember) return notFoundResponse(res);
  res.status(200).json(clubhouseMember);
});

router.post('/', validate(joiSchema), async (req, res) => {
  let clubhouseMember = await ClubhouseMember.findOne({ resident: req.body.resident });
  if (clubhouseMember)
    return res.status(400).json({ message: 'clubhouse member with the given id already exists' });
  clubhouseMember = new ClubhouseMember(req.body);
  await clubhouseMember.save();
  res.status(200).json(clubhouseMember);
});

router.put('/:id', validate('id'), validate(joiSchema), async (req, res) => {
  const clubhouseMember = await ClubhouseMember.findByIdAndUpdate(req.params, req.body, { new: true });
  if (!clubhouseMember) return notFoundResponse(res);
  res.status(200).json(clubhouseMember);
});

router.delete('/:id', validate('id'), async (req, res) => {
  const clubhouseMember = await ClubhouseMember.findByIdAndRemove(req.params);
  if (!clubhouseMember) return notFoundResponse(res);
  res.status(200).json(clubhouseMember);
});

module.exports = router;
