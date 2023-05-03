const express = require('express');

const router = express.Router();

router.get('/', async (req, res) => {
  res.status().send();
});

router.get('/:id', async (req, res) => {
  res.status().send();
});

router.post('/', async (req, res) => {
  res.status().send();
});

router.put('/:id', async (req, res) => {
  res.status().send();
});

router.delete('/:id', async (req, res) => {
  res.status().send();
});

module.exports = router;
