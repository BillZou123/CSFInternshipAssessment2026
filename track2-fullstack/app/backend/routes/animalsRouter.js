const express = require('express');
const router = express.Router();

const { HttpError } = require('../services/errors');
const animalService = require('../services/animalService');

function sendError(res, error, fallbackMessage) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }

  return res.status(500).json({ error: fallbackMessage });
}

router.get('/', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    res.json(animalService.listAnimals(page, limit));
  } catch (error) {
    sendError(res, error, 'Failed to list animals');
  }
});

router.post('/', (req, res) => {
  try {
    res.status(201).json(animalService.createAnimal(req.body));
  } catch (error) {
    sendError(res, error, 'Failed to create animal');
  }
});

router.get('/:id', (req, res) => {
  try {
    res.json(animalService.getAnimalById(req.params.id));
  } catch (error) {
    sendError(res, error, 'Failed to load animal');
  }
});

router.put('/:id', (req, res) => {
  try {
    res.json(animalService.updateAnimal(req.params.id, req.body));
  } catch (error) {
    sendError(res, error, 'Failed to update animal');
  }
});

router.delete('/:id', (req, res) => {
  try {
    res.json(animalService.deleteAnimal(req.params.id));
  } catch (error) {
    sendError(res, error, 'Failed to delete animal');
  }
});

router.get('/:id/health-events', (req, res) => {
  try {
    res.json(animalService.listHealthEvents(req.params.id));
  } catch (error) {
    sendError(res, error, 'Failed to load health events');
  }
});

router.post('/:id/health-events', (req, res) => {
  try {
    res.status(201).json(animalService.createHealthEvent(req.params.id, req.body));
  } catch (error) {
    sendError(res, error, 'Failed to create health event');
  }
});

router.get('/:id/weights', (req, res) => {
  try {
    res.json(animalService.listWeights(req.params.id));
  } catch (error) {
    sendError(res, error, 'Failed to load weight history');
  }
});

router.post('/:id/weights', (req, res) => {
  try {
    res.status(201).json(animalService.createWeight(req.params.id, req.body));
  } catch (error) {
    sendError(res, error, 'Failed to create weight record');
  }
});

module.exports = router;