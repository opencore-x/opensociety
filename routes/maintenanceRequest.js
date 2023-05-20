const express = require('express');
const { MaintenanceRequest, validateMaintenanceRequest } = require('../models/maintenanceRequest.js');
const router = express.Router();

// add a new maintenance request
router.post('/', async (req, res) => {
  let maintenanceRequest = {
    apartment: req.body.apartment,
    work: req.body.work,
    detail: req.body.detail,
    status: {
      resolved: req.body.status.resolved,
      timeAdded: req.body.status.timeAdded,
      timeResolved: req.body.status.timeResolved,
    },
  };

  const { value, error } = validateMaintenanceRequest(maintenanceRequest);
  if (error) return res.status(500).send(error.details[0].message);

  maintenanceRequest = new MaintenanceRequest(value);
  maintenanceRequest = await maintenanceRequest.save();
  res.status(200).send(maintenanceRequest);
});

// edit an existing maintenance request
router.put('/:id', async (req, res) => {
  let maintenanceRequest = {
    apartment: req.body.apartment,
    work: req.body.work,
    detail: req.body.detail,
    status: {
      resolved: req.body.status.resolved,
      timeAdded: req.body.status.timeAdded,
      timeResolved: req.body.status.timeResolved,
    },
  };

  const { value, error } = validateMaintenanceRequest(maintenanceRequest);
  if (error) return res.status(500).send(error.details[0].message);

  try {
    maintenanceRequest = await MaintenanceRequest.findByIdAndUpdate(req.params.id, maintenanceRequest, {
      new: true,
    });
    if (!maintenanceRequest) return res.status(404).send('Maintenance request not found');
    res.status(200).send(maintenanceRequest);
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = router;
