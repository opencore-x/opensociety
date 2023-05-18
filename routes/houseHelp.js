const express = require('express');
const HouseHelp = require('../models/houseHelp');
const router = express.Router();

router.get('/', async (req, res) => {});

// add a new house help
router.post('/', async (req, res) => {
  let houseHelp = new HouseHelp({
    name: req.body.name,
    phone: req.body.phone,
    worksAt: req.body.worksAt,
    duties: req.body.duties,
  });

  houseHelp = await houseHelp.save();
  res.status(200).send(houseHelp);
});

module.exports = router;
