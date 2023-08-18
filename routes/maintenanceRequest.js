const express = require('express');
const { MaintenanceRequest, validate } = require('../models/MaintenanceRequest.js');

const router = express.Router();

// get all the maintenance request
router.get('/', async (req, res) => {
  const maintenanceRequest = await MaintenanceRequest.find();
  res.status(200).send(maintenanceRequest);
});

// get a specific maintenance request
router.get('/:id', async (req, res) => {
  const { value, error } = validate({ body: null, id: req.params.id });
  if (error) return res.status(400).send(error.details[0].message);

  const maintenanceRequest = await MaintenanceRequest.findById(req.params.id);
  if (!maintenanceRequest) return res.status(404).send('maintenance request not found');
  res.status(200).send(maintenanceRequest);
});

// add a new maintenance request
router.post('/', async (req, res) => {
  const { value, error } = validate({ body: req.body, id: null });
  if (error) return res.status(400).send(error.details[0].message);

  const maintenanceRequest = new MaintenanceRequest(value);
  await maintenanceRequest.save();
  res.status(200).send(maintenanceRequest);
});

// edit an existing maintenance request
router.put('/:id', async (req, res) => {
  const { value, error } = validate({ body: req.body, id: req.params.id });
  if (error) return res.status(400).send(error.details[0].message);

  const maintenanceRequest = await MaintenanceRequest.findByIdAndUpdate(req.params.id, maintenanceRequest, {
    new: true,
  });
  if (!maintenanceRequest) return res.status(404).send('Maintenance request not found');
  res.status(200).send(maintenanceRequest);
});

// delete a maintenance request
router.delete('/:id', async (req, res) => {
  const { value, error } = validate({ body: null, id: req.params.id });
  if (error) return res.status(400).send(error.details[0].message);

  const maintenanceRequest = await MaintenanceRequest.findByIdAndRemove(req.params.id);
  if (!maintenanceRequest) return res.status(404).send('maintenance request not found');
  res.status(200).send(maintenanceRequest);
});

module.exports = router;
