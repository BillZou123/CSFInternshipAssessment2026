const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'farmtracker-test-'));
process.env.FARMTRACKER_DB_PATH = path.join(tempDir, 'farmtracker.db');

const app = require('../server');
const { db } = require('../db');

let server;
let baseUrl;

before(async () => {
  seedTestData();
  server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

function seedTestData() {
  db.exec('DELETE FROM health_events; DELETE FROM weights; DELETE FROM animals; DELETE FROM paddocks;');

  const northId = db.prepare(
    'INSERT INTO paddocks (name, capacity, animal_count) VALUES (?, ?, 0)'
  ).run('North Paddock', 50).lastInsertRowid;

  const southId = db.prepare(
    'INSERT INTO paddocks (name, capacity, animal_count) VALUES (?, ?, 0)'
  ).run('South Paddock', 30).lastInsertRowid;

  const insertAnimal = db.prepare(
    'INSERT INTO animals (name, tag_number, breed, date_of_birth, paddock_id) VALUES (?, ?, ?, ?, ?)'
  );

  const bellaId = insertAnimal.run('Bella', 'TAG-001', 'Merino', '2021-03-14', northId).lastInsertRowid;
  insertAnimal.run('Daisy', 'TAG-002', 'Dorper', '2020-07-22', southId);
  insertAnimal.run('Milo', 'TAG-003', 'Suffolk', '2022-05-09', northId);

  db.prepare('UPDATE paddocks SET animal_count = animal_count + 1 WHERE id = ?').run(northId);
  db.prepare('UPDATE paddocks SET animal_count = animal_count + 1 WHERE id = ?').run(northId);
  db.prepare('UPDATE paddocks SET animal_count = animal_count + 1 WHERE id = ?').run(southId);

  db.prepare(
    'INSERT INTO health_events (animal_id, event_type, notes, date, vet_name) VALUES (?, ?, ?, ?, ?)'
  ).run(bellaId, 'vaccination', 'Routine vaccination', '2024-01-15', 'Dr. Walsh');
}

async function get(path) {
  const res = await fetch(baseUrl + path);
  return { status: res.status, body: await res.json() };
}

async function post(path, body) {
  const res = await fetch(baseUrl + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function put(path, body) {
  const res = await fetch(baseUrl + path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

test('GET /api/paddocks returns an array', async () => {
  const { status, body } = await get('/paddocks');
  assert.equal(status, 200);
  assert.ok(Array.isArray(body));
});

test('GET /api/animals returns animals with latest_health_event field', async () => {
  const { status, body } = await get('/animals?page=0&limit=5');
  assert.equal(status, 200);
  assert.ok(Array.isArray(body));
  assert.ok(body.length > 0);
  assert.ok('latest_health_event' in body[0]);
});

test('GET /api/animals paginates without overlapping records', async () => {
  const { status: page0Status, body: page0 } = await get('/animals?page=0&limit=2');
  const { status: page1Status, body: page1 } = await get('/animals?page=1&limit=2');

  assert.equal(page0Status, 200);
  assert.equal(page1Status, 200);

  const page0Ids = new Set(page0.map(a => a.id));
  const overlap = page1.some(a => page0Ids.has(a.id));

  assert.equal(overlap, false);
});

test('GET /api/animals/:id returns a single animal', async () => {
  const { body: animals } = await get('/animals?page=0&limit=1');
  const id = animals[0].id;
  const { status, body } = await get(`/animals/${id}`);
  assert.equal(status, 200);
  assert.equal(body.id, id);
});

test('GET /api/animals/:id returns 404 for unknown id', async () => {
  const { status } = await get('/animals/999999');
  assert.equal(status, 404);
});

test('POST /api/animals creates animal and returns 201', async () => {
  const { status, body } = await post('/animals', {
    name: 'Ruby',
    tag_number: 'TAG-100',
    breed: 'Merino',
    date_of_birth: '2023-01-01',
  });

  assert.equal(status, 201);
  assert.equal(body.name, 'Ruby');
  assert.equal(body.tag_number, 'TAG-100');
});

test('POST /api/animals returns 409 when tag_number already exists', async () => {
  const { status, body } = await post('/animals', {
    name: 'Duplicate Tag',
    tag_number: 'TAG-001',
    breed: 'Dorper',
  });

  assert.equal(status, 409);
  assert.equal(body.error, 'tag_number must be unique');
});

test('POST /api/animals returns 422 for invalid paddock_id', async () => {
  const { status, body } = await post('/animals', {
    name: 'Bad Paddock',
    tag_number: 'TAG-101',
    paddock_id: 999999,
  });

  assert.equal(status, 422);
  assert.equal(body.error, 'Invalid paddock_id');
});

test('POST /api/animals/:id/weights creates a weight record and returns 201', async () => {
  const { status, body } = await post('/animals/1/weights', {
    weight_kg: 45.2,
    date: '2024-11-15',
    notes: 'Post-shearing weigh-in',
  });

  assert.equal(status, 201);
  assert.equal(body.animal_id, 1);
  assert.equal(body.weight_kg, 45.2);
  assert.equal(body.date, '2024-11-15');
  assert.equal(body.notes, 'Post-shearing weigh-in');
});

test('POST /api/animals/:id/weights returns 422 for missing or non-positive weight_kg', async () => {
  const missing = await post('/animals/1/weights', {
    date: '2024-11-15',
  });
  assert.equal(missing.status, 422);

  const zero = await post('/animals/1/weights', {
    weight_kg: 0,
    date: '2024-11-15',
  });
  assert.equal(zero.status, 422);
});

test('POST /api/animals/:id/weights returns 404 if animal does not exist', async () => {
  const { status } = await post('/animals/999999/weights', {
    weight_kg: 50,
    date: '2024-11-15',
  });

  assert.equal(status, 404);
});

test('GET /api/animals/:id/weights returns weight history ordered by date descending', async () => {
  await post('/animals/2/weights', {
    weight_kg: 44.3,
    date: '2024-11-10',
  });
  await post('/animals/2/weights', {
    weight_kg: 45.2,
    date: '2024-11-15',
  });

  const { status, body } = await get('/animals/2/weights');

  assert.equal(status, 200);
  assert.ok(Array.isArray(body));
  assert.equal(body.length, 2);
  assert.equal(body[0].date, '2024-11-15');
  assert.equal(body[1].date, '2024-11-10');
});

test('POST /api/animals/:id/health-events creates an event', async () => {
  const { body: animals } = await get('/animals?page=0&limit=1');
  const id = animals[0].id;
  const { status, body } = await post(`/animals/${id}/health-events`, {
    event_type: 'checkup',
    date: '2025-01-10',
    vet_name: 'Dr. Test',
  });
  assert.equal(status, 201);
  assert.equal(body.event_type, 'checkup');
  assert.equal(body.animal_id, id);
});

test('PUT /api/animals/:id reassigns paddock and keeps counts consistent', async () => {
  const { body: paddocksBefore } = await get('/paddocks');
  const north = paddocksBefore.find(p => p.name === 'North Paddock');
  const south = paddocksBefore.find(p => p.name === 'South Paddock');

  const { body: bella } = await get('/animals/1');
  assert.equal(bella.paddock_id, north.id);

  const { status } = await put('/animals/1', { paddock_id: south.id });
  assert.equal(status, 200);

  const { body: northAfter } = await get(`/paddocks/${north.id}`);
  const { body: southAfter } = await get(`/paddocks/${south.id}`);

  assert.equal(northAfter.animal_count, north.animal_count - 1);
  assert.equal(southAfter.animal_count, south.animal_count + 1);
});
