# Retrospective

## Trade-offs I Made
I made two major design decisions:

1. **Introduce a lightweight service layer (instead of keeping all logic in routes).**  
	I moved core business rules into backend services and kept route files thinner. The upside is clearer separation of concerns, easier reuse of validation/business logic, and safer multi-step operations with explicit transaction boundaries. The trade-off is extra structural complexity in a small codebase: more files, more indirection, and a slightly higher onboarding cost for someone reading the project for the first time.

2. **Extend the existing API contract incrementally (instead of redesigning it).**  
	I added capabilities such as `paddock_name`, search/filter query support, and weight endpoints while preserving existing endpoint shapes and keeping the stack unchanged. The upside is lower migration risk and faster delivery under assessment constraints, because frontend changes could be layered on without a full rewrite. The trade-off is that the API is still partly evolution-driven rather than fully domain-modeled, so there is some remaining inconsistency that I would address in a later hardening pass.

## What I Would Do Differently with More Time
With more time, I would add broader automated coverage: frontend interaction tests, additional API failure-path tests, and migration-focused tests for schema evolution. I would also add stronger domain validation (date format constraints, richer input validation messages, and explicit max-stay/flag rules if “Holding Pen” becomes a true operational concept).

I would improve UX resilience further with inline form validation, toasts, loading states per action, and optimistic updates where safe.

## What I Deliberately Left Alone
I did not migrate the stack or introduce heavier frameworks, because the existing Node/Express/SQLite setup is appropriate for this scope. I also left deeper reporting/analytics features and broader UI redesign out of scope to keep the submission focused on correctness, maintainability, and the requested feature set.