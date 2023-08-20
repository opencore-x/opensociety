const router = require('express').Router();

router.get('/', async (req, res) => {
  res.status().json();
});

router.get('/:id', async (req, res) => {
  res.status().json();
});

router.post('/', async (req, res) => {
  res.status().json();
});

router.put('/:id', async (req, res) => {
  res.status().json();
});

router.delete('/:id', async (req, res) => {
  res.status().json();
});

module.exports = router;
