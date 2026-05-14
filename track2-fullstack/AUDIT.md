# Code Review Audit

## Summary
FarmTracker is small and easy to follow, but several core flows depend on optimistic assumptions instead of enforcing correctness at the API and database boundaries. The biggest risk is not visual polish or minor UX issues, but silent data drift: paddock occupancy, pagination, and validation can all become inaccurate while the API still appears to succeed. On top of that, the route handlers currently combine request handling, validation, business rules, and SQL in one place, which makes the code harder to test and riskier to change.

## Issues Found

### Critical Issues

**1. Paddock counts can become inaccurate**  
**Where:** `app/backend/routes/animals.js`  
**Endpoints:** `POST /api/animals`, `PUT /api/animals/:id`, `DELETE /api/animals/:id`  
Creating an animal increments `animal_count`, and deleting an animal decrements it, but reassigning an animal only increments the new paddock and never decrements the old one. That means a single move can leave paddock occupancy permanently incorrect. There is also no strong validation around paddock existence or capacity, so the stored count can drift away from reality.

**2. Pagination logic is incorrect**  
**Where:** `app/backend/routes/animals.js`  
**Endpoint:** `GET /api/animals`  
The animals listing uses `page` directly as the SQL offset instead of calculating `page * limit`. In practice, that causes overlapping pages and incorrect results as soon as the user moves past the first page.

**3. Validation and API responses are inconsistent**  
**Where:** `app/backend/routes/animals.js`, `app/backend/routes/paddocks.js`  
**Endpoints:** `POST /api/animals`, `POST /api/paddocks`, plus update/create flows that rely on database constraints  
`POST /animals` returns 200 instead of 201, required-field checks are minimal, and database constraint failures such as duplicate `tag_number` are not surfaced as clear client errors. The API works for the happy path, but it does not communicate failure states consistently.

### Medium-Priority Issues

**4. Frontend error handling is weak**  
**Where:** `app/frontend/app.js`, `app/frontend/animals.html`, `app/frontend/animal-detail.html`, `app/frontend/index.html`  
**Endpoints involved:** all frontend API calls, especially `GET /api/animals`, `GET /api/paddocks`, `GET /api/animals/:id`, and `POST /api/animals/:id/health-events`  
The frontend mostly assumes requests succeed. When an API request fails, the user is likely to see a broken interaction or an uncaught error rather than a clear, recoverable message.

**5. Route handlers are doing too much**  
**Where:** `app/backend/routes/animals.js`, `app/backend/routes/paddocks.js`  
**Endpoints involved:** most backend routes, especially `POST /api/animals`, `PUT /api/animals/:id`, `DELETE /api/animals/:id`, and `POST /api/animals/:id/health-events`  
The current routes mix HTTP handling, validation, business rules, and database access in the same functions. This makes future changes harder, especially for multi-step operations that should be kept consistent.

**6. UI data is functional but not very user-friendly**  
**Where:** `app/frontend/animals.html`, `app/frontend/animal-detail.html`, and the corresponding animal payload from `app/backend/routes/animals.js`  
**Endpoints involved:** `GET /api/animals`, `GET /api/animals/:id`  
Some frontend pages expose raw IDs, such as paddock IDs, instead of richer joined data like paddock names. On the animals page this makes the paddock column harder to understand than necessary, because users see values like `1`, `2`, or `3` instead of meaningful names such as North, South, or East.

**7. Navigation and filtering on the list views are limited**  
**Where:** `app/frontend/index.html`, `app/frontend/animals.html`, and related API responses from `app/backend/routes/paddocks.js` and `app/backend/routes/animals.js`  
**Endpoints involved:** `GET /api/paddocks`, `GET /api/animals`  
The paddock cards on the home page are displayed as static summaries, but they are not clickable, so a user cannot drill into the animals belonging to a selected paddock. The animals page also lacks basic search or filter functionality, which makes it harder to find a specific record once the dataset grows. These are usability issues rather than correctness bugs, but they limit how practical the app feels in day-to-day use.

## What I Would Fix First

**First priority: data integrity issues.**  
I would fix paddock reassignment logic, paddock validation, and any occupancy consistency issues before anything else. These are the most dangerous problems because they can silently corrupt the farm's records.

**Second priority: pagination correctness.**  
Pagination is a core user-facing feature and it is currently wrong. It is a relatively small fix with a high impact on correctness.

**Third priority: validation and response behavior.**  
Once the core data issues are addressed, I would normalise status codes and validation responses so the API is predictable and easy to test. This also creates a better foundation for the upcoming weight-tracking feature.

## What I Would Leave for Later

**Architectural cleanup** would be my main deferred item. The codebase would benefit from separating route logic from domain logic and persistence, ideally with clearer transaction boundaries around multi-step writes. That is worth doing, but it is broader in scope than the most urgent bug fixes.

I would also defer **broader frontend UX improvements**, such as showing paddock names instead of IDs, making paddock cards clickable, and adding search/filter flows on the animals page, until the correctness issues are resolved. Finally, I would expand **test coverage for failure paths and edge cases** after the main bugs are fixed, so those tests reflect the intended behavior rather than the current flawed implementation.