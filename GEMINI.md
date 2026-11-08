# Engineering Rules

## 1. Before Writing Code
1. Clarify requirements and expected behavior. If ambiguous, ask instead of guessing.
2. Read the relevant code first: entities, services, controllers, components, migrations, existing tests.
3. Reuse existing components, services, utilities, and APIs before creating new ones.
4. Map the impact: frontend, backend, database, external integrations, dependencies, side effects.
5. Check compatibility with the current architecture and business rules.

**Planning gate**
- Trivial changes (bug fix, copy/style tweak, single-file refactor): proceed, then summarize.
- Non-trivial changes: write a short plan (files to touch, approach, risks) before coding.
- STOP and wait for explicit approval before: new features spanning multiple layers, architectural changes, schema/migration changes, API contract changes, or any destructive operation.

## 2. Architecture
- Follow existing patterns and project conventions; do not introduce new ones without written justification.
- Keep layers separated (controller → service → repository, DTOs at the boundary).
- No duplicated business logic; no speculative abstractions or extra services.
- Do not change existing API contracts or remove functionality unless explicitly requested.

## 3. Database
- Inspect entities, relationships, constraints, and migrations before changing anything.
- Preserve referential integrity; wrap multi-step writes in transactions.
- Avoid N+1 queries (use joins/eager loading/batching).
- Schema changes go through migrations, with their impact explained beforehand.
- Never run destructive operations (DROP, TRUNCATE, bulk DELETE/UPDATE, data resets) without explicit approval.

## 4. API
- Follow existing REST conventions and error format.
- Use DTOs for requests/responses; validate all input at the boundary.
- Enforce authentication and authorization on protected endpoints.
- Keep backward compatibility; if a breaking change is unavoidable, flag it and get approval.

## 5. Frontend
- Reuse existing components, hooks, and design tokens; keep UI/UX consistent.
- Strict TypeScript; no `any` unless justified in a comment.
- Keep components small, focused, and reusable.
- Always handle loading, empty, success, and error states.
- Validate forms; keep layouts responsive.

## 6. Security
- Never hardcode, log, or commit secrets, tokens, or credentials.
- Sanitize and validate untrusted input; use parameterized queries.
- Do not expose sensitive fields in responses or logs.
- Re-review auth, permissions, and data exposure on every security-relevant change.

## 7. Change Management
- Touch only files required for the task; keep diffs minimal and focused.
- Do not overwrite unrelated user changes or reformat untouched code.
- Do not modify env vars, config, or CI files silently; say so explicitly if needed.
- Do not add dependencies without stating why, the alternatives considered, and the cost.
- Never run git commit or git push automatically. Always leave changes uncommitted for the user to review, unless explicitly requested.

## 8. Verification (required before claiming "done")
1. Compile/build succeeds.
2. Run relevant unit tests, plus integration tests where applicable; add/update tests for new behavior.
3. Run lint/type-check.
4. Check affected flows for regressions.
5. Report honestly: what passed, what failed, what was NOT run and why.
Never state that something works unless it was actually verified.

## 9. Final Report
- Summary of changes
- Files created / modified / deleted
- Architecture, API, or database impact (including migrations)
- Verification results (passed / failed / not run)
- Known limitations, risks, and suggested follow-ups