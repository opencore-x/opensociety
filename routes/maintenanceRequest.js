const router = require('express').Router();
const { MaintenanceRequest, joiSchema } = require('../models/MaintenanceRequest.js');
const validate = require('../middleware/validate');

// get all the maintenance request
router.get('/', async (req, res) => {
  const maintenanceRequest = await MaintenanceRequest.find();
  res.status(200).send(maintenanceRequest);
});

// get a specific maintenance request
router.get('/:id', validate('id'), async (req, res) => {
  const maintenanceRequest = await MaintenanceRequest.findById(req.params.id);
  if (!maintenanceRequest) return res.status(404).send('maintenance request not found');
  res.status(200).send(maintenanceRequest);
});

// add a new maintenance request
router.post('/', validate(joiSchema), async (req, res) => {
  const maintenanceRequest = new MaintenanceRequest(req.body);
  await maintenanceRequest.save();
  res.status(200).send(maintenanceRequest);
});

// edit an existing maintenance request
router.put('/:id', validate('id'), validate(joiSchema), async (req, res) => {
  const maintenanceRequest = await MaintenanceRequest.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!maintenanceRequest) return res.status(404).send('Maintenance request not found');
  res.status(200).send(maintenanceRequest);
});

// delete a maintenance request
router.delete('/:id', validate('id'), async (req, res) => {
  const maintenanceRequest = await MaintenanceRequest.findByIdAndRemove(req.params.id);
  if (!maintenanceRequest) return res.status(404).send('maintenance request not found');
  res.status(200).send(maintenanceRequest);
});

module.exports = router;
