const { db, withTransaction } = require('../db');
const { HttpError } = require('./errors');

function isUniqueConstraintError(error, table, column) {
  return error
    && typeof error.message === 'string'
    && error.message.includes(`UNIQUE constraint failed: ${table}.${column}`);
}

function listPaddocks() {
  return db.prepare('SELECT * FROM paddocks').all();
}

function getPaddockById(id) {
  const paddock = db.prepare('SELECT * FROM paddocks WHERE id = ?').get(id);
  if (!paddock) {
    throw new HttpError(404, 'Paddock not found');
  }

  return paddock;
}

function createPaddock(body) {
  const { name, capacity } = body;

  if (!name || !capacity) {
    throw new HttpError(400, 'name and capacity are required');
  }

  try {
    return withTransaction(() => {
      const result = db.prepare(
        'INSERT INTO paddocks (name, capacity) VALUES (?, ?)'
      ).run(name, capacity);

      return db.prepare('SELECT * FROM paddocks WHERE id = ?').get(result.lastInsertRowid);
    });
  } catch (error) {
    if (isUniqueConstraintError(error, 'paddocks', 'name')) {
      throw new HttpError(409, 'name must be unique');
    }

    throw error;
  }
}

module.exports = {
  createPaddock,
  getPaddockById,
  listPaddocks,
};