# FarmTracker

A livestock record management application for tracking animals, paddock assignments, health events, and weight history.

## Requirements

- Node.js 22.5+ (uses built-in `node:sqlite`)

## Setup

```bash
cd backend
npm install
node seed.js
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Running tests

The test suite starts its own server and temporary SQLite database:

```bash
cd backend
npm test
```

## Project structure

```
app/
├── backend/
│   ├── server.js              # Express app entry point
│   ├── db.js                  # Database connection, schema, transaction helper
│   ├── routes/
│   │   ├── animalsRouter.js   # Animal API routes
│   │   └── paddocks.js        # Paddock API routes
│   ├── services/
│   │   ├── animalService.js   # Animal business/domain logic
│   │   ├── paddockService.js  # Paddock business/domain logic
│   │   └── errors.js          # Shared HttpError class
│   ├── test/
│   │   └── api.test.js        # Integration tests
│   ├── seed.js                # Seed script (run once after install)
│   └── package.json
└── frontend/
        ├── index.html             # Paddocks overview (clickable cards)
        ├── animals.html           # Animal list + search + paddock filter
        ├── animal-detail.html     # Animal detail, move paddock, weights, health events
        ├── app.js                 # Shared fetch utilities and API error handling
        └── styles.css
```

## API reference

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/paddocks | List all paddocks |
| POST | /api/paddocks | Create a paddock |
| GET | /api/paddocks/:id | Get a paddock |
| GET | /api/animals | List animals (`page`, `limit`, optional `search`, optional `paddock_id`) |
| POST | /api/animals | Create an animal |
| GET | /api/animals/:id | Get an animal |
| PUT | /api/animals/:id | Update an animal (including paddock reassignment) |
| DELETE | /api/animals/:id | Delete an animal |
| GET | /api/animals/:id/health-events | List health events |
| POST | /api/animals/:id/health-events | Log a health event |
| GET | /api/animals/:id/weights | List weight history (ordered by date desc) |
| POST | /api/animals/:id/weights | Log a weight measurement |

## Frontend behavior

- Home page paddock cards link to filtered animal views.
- Animals page supports:
    - search by tag/name/breed
    - filter by paddock
    - pagination
- Animal detail page supports:
    - logging and viewing health events
    - logging and viewing weight history
    - moving an animal to another paddock (or unassigning it)
