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

module.exports = require('./animalsRouter');
/*

router.delete('/:id', (req, res) => {
  const animal = db.prepare('SELECT * FROM animals WHERE id = ?').get(req.params.id);
  if (!animal) return res.status(404).json({ error: 'Animal not found' });

  if (animal.paddock_id) {
    db.prepare(
      'UPDATE paddocks SET animal_count = animal_count - 1 WHERE id = ?'
    ).run(animal.paddock_id);
  }

  db.prepare('DELETE FROM animals WHERE id = ?').run(req.params.id);
  res.json({ message: 'deleted' });
});

router.get('/:id/health-events', (req, res) => {
  const animal = db.prepare('SELECT * FROM animals WHERE id = ?').get(req.params.id);
  if (!animal) return res.status(404).json({ error: 'Animal not found' });

  const events = db.prepare(
    'SELECT * FROM health_events WHERE animal_id = ? ORDER BY date DESC'
  ).all(req.params.id);
  res.json(events);
});

router.post('/:id/health-events', (req, res) => {
  const animal = db.prepare('SELECT * FROM animals WHERE id = ?').get(req.params.id);
  if (!animal) return res.status(404).json({ error: 'Animal not found' });

  const { event_type, notes, date, vet_name } = req.body;
  if (!event_type || !date) {
    return res.status(400).json({ error: 'event_type and date are required' });
  }

  const result = db.prepare(
    'INSERT INTO health_events (animal_id, event_type, notes, date, vet_name) VALUES (?, ?, ?, ?, ?)'
  ).run(req.params.id, event_type, notes ?? null, date, vet_name ?? null);

  const event = db.prepare('SELECT * FROM health_events WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(event);
});

router.get('/:id/weights', (req, res) => {
  const animal = db.prepare('SELECT * FROM animals WHERE id = ?').get(req.params.id);
  if (!animal) return res.status(404).json({ error: 'Animal not found' });

  const weights = db.prepare(
    'SELECT * FROM weights WHERE animal_id = ? ORDER BY date DESC, id DESC'
  ).all(req.params.id);

  res.json(weights);
});

router.post('/:id/weights', (req, res) => {
  const animal = db.prepare('SELECT * FROM animals WHERE id = ?').get(req.params.id);
  if (!animal) return res.status(404).json({ error: 'Animal not found' });

  const { weight_kg, date, notes } = req.body;
  const parsedWeight = Number(weight_kg);
  if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
*/
