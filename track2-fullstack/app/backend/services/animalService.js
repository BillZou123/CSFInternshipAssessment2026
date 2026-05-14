const { db, withTransaction } = require('../db');
const { HttpError } = require('./errors');

function isUniqueConstraintError(error, table, column) {
  return error
    && typeof error.message === 'string'
    && error.message.includes(`UNIQUE constraint failed: ${table}.${column}`);
}

function getAnimalById(id) {
  const animal = db.prepare(`
    SELECT animals.*, paddocks.name AS paddock_name
    FROM animals
    LEFT JOIN paddocks ON paddocks.id = animals.paddock_id
    WHERE animals.id = ?
  `).get(id);
  if (!animal) {
    throw new HttpError(404, 'Animal not found');
  }

  return animal;
}

function getPaddockForAssignmentOrThrow(paddockId) {
  const paddock = db.prepare(
    'SELECT id, capacity, animal_count FROM paddocks WHERE id = ?'
  ).get(paddockId);

  if (!paddock) {
    throw new HttpError(422, 'Invalid paddock_id');
  }

  if (paddock.animal_count >= paddock.capacity) {
    throw new HttpError(422, 'Paddock is at full capacity');
  }

  return paddock;
}

function listAnimals(page, limit, filters = {}) {
  const offset = page * limit;
  const where = [];
  const params = [];

  if (filters.search) {
    where.push('(animals.name LIKE ? OR animals.tag_number LIKE ? OR animals.breed LIKE ?)');
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }

  if (filters.paddockId !== undefined && filters.paddockId !== null && filters.paddockId !== '') {
    where.push('animals.paddock_id = ?');
    params.push(filters.paddockId);
  }

  const sql = `
    SELECT animals.*, paddocks.name AS paddock_name
    FROM animals
    LEFT JOIN paddocks ON paddocks.id = animals.paddock_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY animals.id ASC
    LIMIT ? OFFSET ?
  `;

  const animals = db.prepare(sql).all(...params, limit, offset);

  return animals.map(animal => {
    const latestEvent = db.prepare(`
      SELECT * FROM health_events
      WHERE animal_id = ?
      ORDER BY date DESC
      LIMIT 1
    `).get(animal.id);

    return { ...animal, latest_health_event: latestEvent ?? null };
  });
}

function createAnimal(body) {
  const { name, tag_number, breed, date_of_birth, paddock_id } = body;

  if (!name || !tag_number) {
    throw new HttpError(400, 'name and tag_number are required');
  }

  if (paddock_id !== undefined && paddock_id !== null) {
    getPaddockForAssignmentOrThrow(paddock_id);
  }

  try {
    return withTransaction(() => {
      const result = db.prepare(
        'INSERT INTO animals (name, tag_number, breed, date_of_birth, paddock_id) VALUES (?, ?, ?, ?, ?)'
      ).run(name, tag_number, breed ?? null, date_of_birth ?? null, paddock_id ?? null);

      if (paddock_id !== undefined && paddock_id !== null) {
        db.prepare(
          'UPDATE paddocks SET animal_count = animal_count + 1 WHERE id = ?'
        ).run(paddock_id);
      }

      return db.prepare('SELECT * FROM animals WHERE id = ?').get(result.lastInsertRowid);
    });
  } catch (error) {
    if (isUniqueConstraintError(error, 'animals', 'tag_number')) {
      throw new HttpError(409, 'tag_number must be unique');
    }

    throw error;
  }
}

function updateAnimal(id, body) {
  const animal = getAnimalById(id);

  const hasPaddockId = Object.prototype.hasOwnProperty.call(body, 'paddock_id');
  const nextPaddockId = hasPaddockId ? body.paddock_id : animal.paddock_id;

  const updates = {
    name: body.name ?? animal.name,
    tag_number: body.tag_number ?? animal.tag_number,
    breed: body.breed ?? animal.breed,
    date_of_birth: body.date_of_birth ?? animal.date_of_birth,
    paddock_id: nextPaddockId,
  };

  if (updates.paddock_id !== animal.paddock_id && updates.paddock_id !== null) {
    getPaddockForAssignmentOrThrow(updates.paddock_id);
  }

  try {
    return withTransaction(() => {
      db.prepare(`
        UPDATE animals
        SET name = ?, tag_number = ?, breed = ?, date_of_birth = ?, paddock_id = ?
        WHERE id = ?
      `).run(updates.name, updates.tag_number, updates.breed, updates.date_of_birth, updates.paddock_id, id);

      if (updates.paddock_id !== animal.paddock_id) {
        if (animal.paddock_id !== null) {
          db.prepare(
            'UPDATE paddocks SET animal_count = animal_count - 1 WHERE id = ?'
          ).run(animal.paddock_id);
        }

        if (updates.paddock_id !== null) {
          db.prepare(
            'UPDATE paddocks SET animal_count = animal_count + 1 WHERE id = ?'
          ).run(updates.paddock_id);
        }
      }

      return db.prepare('SELECT * FROM animals WHERE id = ?').get(id);
    });
  } catch (error) {
    if (isUniqueConstraintError(error, 'animals', 'tag_number')) {
      throw new HttpError(409, 'tag_number must be unique');
    }

    throw error;
  }
}

function deleteAnimal(id) {
  const animal = getAnimalById(id);

  return withTransaction(() => {
    if (animal.paddock_id !== null) {
      db.prepare(
        'UPDATE paddocks SET animal_count = animal_count - 1 WHERE id = ?'
      ).run(animal.paddock_id);
    }

    db.prepare('DELETE FROM animals WHERE id = ?').run(id);
    return { message: 'deleted' };
  });
}

function listHealthEvents(id) {
  getAnimalById(id);

  return db.prepare(
    'SELECT * FROM health_events WHERE animal_id = ? ORDER BY date DESC'
  ).all(id);
}

function createHealthEvent(id, body) {
  getAnimalById(id);

  const { event_type, notes, date, vet_name } = body;
  if (!event_type || !date) {
    throw new HttpError(400, 'event_type and date are required');
  }

  return withTransaction(() => {
    const result = db.prepare(
      'INSERT INTO health_events (animal_id, event_type, notes, date, vet_name) VALUES (?, ?, ?, ?, ?)'
    ).run(id, event_type, notes ?? null, date, vet_name ?? null);

    return db.prepare('SELECT * FROM health_events WHERE id = ?').get(result.lastInsertRowid);
  });
}

function listWeights(id) {
  getAnimalById(id);

  return db.prepare(
    'SELECT * FROM weights WHERE animal_id = ? ORDER BY date DESC, id DESC'
  ).all(id);
}

function createWeight(id, body) {
  getAnimalById(id);

  const { weight_kg, date, notes } = body;
  const parsedWeight = Number(weight_kg);

  if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
    throw new HttpError(422, 'weight_kg must be a positive number');
  }

  if (!date) {
    throw new HttpError(422, 'date is required');
  }

  return withTransaction(() => {
    const result = db.prepare(
      'INSERT INTO weights (animal_id, weight_kg, date, notes) VALUES (?, ?, ?, ?)'
    ).run(id, parsedWeight, date, notes ?? null);

    return db.prepare('SELECT * FROM weights WHERE id = ?').get(result.lastInsertRowid);
  });
}

module.exports = {
  createAnimal,
  createHealthEvent,
  createWeight,
  deleteAnimal,
  getAnimalById,
  listAnimals,
  listHealthEvents,
  listWeights,
  updateAnimal,
};