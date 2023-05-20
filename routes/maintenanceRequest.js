const express = require('express');
const { MaintenanceRequest, validateMaintenanceRequest } = require('../models/maintenanceRequest.js');
const router = express.Router();

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
  if (error) return res.status(500).send(error);

  maintenanceRequest = new MaintenanceRequest(value);
  maintenanceRequest = maintenanceRequest.save();
  res.status(200).send(maintenanceRequest);
});

module.exports = router;
