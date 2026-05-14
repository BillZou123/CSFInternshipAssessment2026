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
