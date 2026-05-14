const express = require('express');
const router = express.Router();

const { HttpError } = require('../services/errors');
const paddockService = require('../services/paddockService');

function sendError(res, error, fallbackMessage) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }

  return res.status(500).json({ error: fallbackMessage });
}

router.get('/', (req, res) => {
  try {
    res.json(paddockService.listPaddocks());
  } catch (error) {
    sendError(res, error, 'Failed to list paddocks');
  }
});

router.post('/', (req, res) => {
  try {
    res.status(201).json(paddockService.createPaddock(req.body));
  } catch (error) {
    sendError(res, error, 'Failed to create paddock');
  }
});

router.get('/:id', (req, res) => {
  try {
    res.json(paddockService.getPaddockById(req.params.id));
  } catch (error) {
    sendError(res, error, 'Failed to load paddock');
  }
});

module.exports = router;
