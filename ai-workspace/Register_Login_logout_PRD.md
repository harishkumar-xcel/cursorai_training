Date created: August 31, 2026
Date last modified: September 1, 2026

# Register, Login, and Logout - Technical PRD

## Overview/Problem

The GreenField Quiz Maker is a multi-teacher application for building banks of multiple-choice questions. Before teachers can create or manage questions, the application must know who they are and keep their sessions secure across visits. Today the starter has no database, no user model, and no authentication — every visitor sees the same anonymous landing page.

Teachers need to register with their email, sign in, and sign out so that future features (question banks, sharing, permissions) can be scoped to individual accounts. This PRD covers the first vertical slice: user persistence, password security, auth endpoints, and a post-login destination stub for the MCQ workspace.

---

## Hypothesis

We believe that providing email-based registration, secure login, and session logout will let multiple teachers independently access the Quiz Maker and establish the identity foundation required for personal test banks.

---

## Scope

### In Scope

- Cloudflare D1 database binding and initial migration for a `users` table
- User service in `src/lib/services/` with create, read, update, and delete operations
- Password hashing before any password is stored; plaintext passwords never persisted
- API route handlers for register, login, and logout under `src/app/api/auth/`
- Register page (`/register`) and login page (`/login`) with form validation
- Session management via HTTP-only cookie after successful register or login
- Redirect authenticated users to an MCQ workspace stub page (`/mcq`)
- Logout clears the session and redirects to `/login`
- Basic route protection: unauthenticated users cannot access `/mcq`; authenticated users visiting `/login` or `/register` are redirected to `/mcq`

### Out of Scope

- MCQ question CRUD, test banks, or quiz publishing (stub page only)
- Password reset, email verification, or "forgot password" flows
- OAuth / social login (Google, Microsoft, etc.)
- Role-based access control (admin vs teacher)
- User profile editing UI (update/delete exist in the service layer for completeness but no profile page in this phase)
- Rate limiting, CAPTCHA, or account lockout
- Remote D1 migration apply or production deployment (local development only)

### Cut

- **Server Actions instead of API routes** — Next.js conventions prefer Server Actions for form mutations, but this PRD uses explicit HTTP endpoints so the user service boundary is clear and testable with standard HTTP clients during training.
- **Separate `username` column** — Username is the email address; storing both would duplicate data. Email is unique and used as the login identifier.
- **JWT in localStorage** — Session token in an HTTP-only cookie reduces XSS exposure and matches server-side session validation on Workers.

---

## Technical Requirements

### Database Schema

Database name (Wrangler): `quizmaker-db`  
Binding name: `DB`

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users (email);
```

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | Opaque UUID-style hex string |
| `first_name` | TEXT NOT NULL | Teacher given name |
| `last_name` | TEXT NOT NULL | Teacher family name |
| `email` | TEXT NOT NULL UNIQUE | Login identifier (case-insensitive match at application layer) |
| `password_hash` | TEXT NOT NULL | bcrypt hash; never store plaintext |
| `created_at` | DATETIME | Set on insert |
| `updated_at` | DATETIME | Updated on profile/password change |

Migration file: created via `npx wrangler d1 migrations create quizmaker-db create_users_table`.

### API Endpoints

All auth endpoints live under `src/app/api/auth/`. Request bodies are validated with Zod before calling the user service.

#### POST /api/auth/register

Creates a new user, establishes a session, and returns the created user (without password).

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@school.edu",
  "password": "SecurePass123"
}
```

**Validation:**
- `firstName`, `lastName`: non-empty, max 100 characters
- `email`: valid email format
- `password`: minimum 8 characters

**Response:**
- Success (201): `{ "user": { "id", "firstName", "lastName", "email", "createdAt" } }` + `Set-Cookie` session header
- Error (400): Validation error `{ "error": "message" }`
- Error (409): Email already registered `{ "error": "An account with this email already exists" }`
- Error (500): Server error

**Behavior:** Hash password, insert user via user service, create session, redirect client to `/mcq` (or return JSON with redirect hint for fetch-based clients).

---

#### POST /api/auth/login

Authenticates an existing user and establishes a session.

**Request Body:**
```json
{
  "email": "jane.smith@school.edu",
  "password": "SecurePass123"
}
```

**Response:**
- Success (200): `{ "user": { "id", "firstName", "lastName", "email" } }` + `Set-Cookie` session header
- Error (400): Validation error
- Error (401): Invalid credentials `{ "error": "Invalid email or password" }` (same message for unknown email and wrong password)
- Error (500): Server error

**Behavior:** Look up user by normalized email, verify password hash, create session, redirect to `/mcq`.

---

#### POST /api/auth/logout

Ends the current session.

**Request Body:** None (session read from cookie)

**Response:**
- Success (200): `{ "success": true }` + cookie cleared via `Set-Cookie` (Max-Age=0)
- Error (401): No active session (optional; may still return 200 for idempotency)

**Behavior:** Invalidate session server-side (if session store used) or clear signed cookie; redirect to `/login`.

---

#### GET /api/auth/me (supporting endpoint)

Returns the currently authenticated user. Used by the MCQ stub page and middleware checks.

**Response:**
- Success (200): `{ "user": { "id", "firstName", "lastName", "email" } }`
- Error (401): Not authenticated

---

### User Service

Location: `src/lib/services/user-service.ts`

Centralizes all D1 access for users. Route handlers and (future) Server Actions call this module; they do not query `env.DB` directly.

| Method | Signature | Description |
|--------|-----------|-------------|
| `createUser` | `(input: CreateUserInput) => Promise<User>` | Hash password, insert row, return user without hash |
| `getUserById` | `(id: string) => Promise<User \| null>` | Fetch by primary key |
| `getUserByEmail` | `(email: string) => Promise<UserWithHash \| null>` | Fetch by email (login) |
| `updateUser` | `(id: string, input: UpdateUserInput) => Promise<User>` | Update name and/or password (re-hash if password changes) |
| `deleteUser` | `(id: string) => Promise<void>` | Hard delete user row |

Types exported from `src/lib/types/user.ts` (or colocated in the service file initially).

Password hashing utility: `src/lib/auth/password.ts` using `bcryptjs` (Workers-compatible, pure JS).

Session utility: `src/lib/auth/session.ts` — create, validate, and clear signed HTTP-only cookies. Session payload: `{ userId, email, exp }`.

### User Interface Requirements

#### Landing / Home (`/`)

- Links to **Register** and **Login**
- If already authenticated, redirect to `/mcq`

#### Register Page (`/register`)

- Form fields: First Name, Last Name, Email, Password, Confirm Password
- Validation (client hints + server Zod):
  - All fields required
  - Email must be valid format
  - Password min 8 characters
  - Confirm password must match password
- Submit posts to `POST /api/auth/register` (via form action or fetch)
- On success: redirect to `/mcq`
- On error: show message via `FieldError` (shadcn `field` component)
- Link: "Already have an account? Log in"

#### Login Page (`/login`)

- Form fields: Email, Password
- Validation: both required; email format checked
- Submit posts to `POST /api/auth/login`
- On success: redirect to `/mcq`
- On error: generic "Invalid email or password" (no hint whether email exists)
- Link: "Don't have an account? Register"

#### MCQ Workspace Stub (`/mcq`)

- Protected route — requires valid session
- Displays welcome message: "Welcome, {firstName} {lastName}"
- Placeholder copy: "Your multiple-choice question bank will be built here."
- **Logout** button posts to `POST /api/auth/logout`, then redirects to `/login`
- Unauthenticated access redirects to `/login`

#### Shared UI

- Use shadcn/ui: `Card`, `Field`, `FieldLabel`, `FieldError`, `Input`, `Button`
- Semantic layout with Tailwind theme tokens from `globals.css`
- Mobile-friendly centered card layout for auth forms

---

## Testing Strategy (Vitest + TDD)

All phases use **test-driven development**: write failing tests first (**RED**), implement the minimum code to pass (**GREEN**), then verify the full suite stays green before marking the phase complete.

### Test Harness

| Item | Value |
|------|-------|
| Framework | [Vitest](https://vitest.dev/) — unit tests for TypeScript modules and API route handlers |
| Config | `vitest.config.ts` at repo root |
| Scripts | `npm test` (single run), `npm test:watch` (watch mode) |
| Colocation | Tests live next to source: `foo.ts` → `foo.test.ts` |
| Path alias | `vite-tsconfig-paths` resolves `@/` in tests |
| React UI (Phase 4) | `@testing-library/react`, `jsdom`, `@vitejs/plugin-react` |

**One-time setup** (before Phase 1 RED):

```bash
npm install -D vitest vite-tsconfig-paths
# Phase 4 only:
npm install -D @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom
```

Add to `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

### TDD Workflow Per Phase

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│ Write tests │ ──► │ npm test     │ ──► │ Implement code  │ ──► │ npm test     │
│ (no impl)   │     │ expect RED   │     │ (minimum)       │     │ expect GREEN │
└─────────────┘     └──────────────┘     └─────────────────┘     └──────────────┘
                                                                          │
                                                                          ▼
                                                              lint + build + push branch
                                                              → wait for user approval
```

### Mocking Conventions

- **D1 / Cloudflare**: Mock `@opennextjs/cloudflare` and supply a fake `env.DB`. Never hit a real database in unit tests.
- **User service** (Phase 3+): Mock `user-service` at the route-handler boundary when testing HTTP responses.
- **Server-only**: `vi.mock("server-only", () => ({}))` when importing server modules in tests.
- **Cookies / headers**: Use Vitest mocks for `next/headers` `cookies()` in session and route tests.

### Phase-to-Acceptance-Criteria Map

| Phase | Vitest proves | Acceptance criteria covered |
|-------|---------------|----------------------------|
| 1 | Schema, migration, D1 binding | D1 configured, migration creates `users` table |
| 2 | Password hash, session, user CRUD | User service CRUD, bcrypt hashing |
| 3 | Register, login, logout, me APIs | All auth endpoints, validation, status codes |
| 4 | Auth pages, middleware, redirects | UI forms, `/mcq` stub, route protection |
| 5 | Full suite + manual preview | lint, build, end-to-end smoke on Workers runtime |

---

## Implementation Phases

### Phase 1: Database Setup - PLANNED

**Objective**: D1 database exists locally with the `users` table.

#### Test Plan (Vitest)

**Test file**: `src/lib/db/database-setup.test.ts`  
**Supporting module**: `src/lib/db/users-schema.ts` (canonical schema constants)

| # | Test (starts RED) | Turns GREEN when |
|---|-------------------|------------------|
| 1 | `users schema definition` — defines the users table name | `USERS_TABLE` exported as `"users"` |
| 2 | defines all required user columns | `USER_COLUMNS` includes all 7 columns |
| 3 | defines the email index | `USER_INDEXES` includes `idx_users_email` |
| 4 | includes every column in the DDL | `USERS_TABLE_DDL` contains all columns |
| 5 | migration file exists with `create_users_table` in filename | `migrations/*_create_users_table.sql` created |
| 6 | migration SQL creates users table with columns and index | Migration file matches schema DDL |
| 7 | `wrangler.jsonc` configures `quizmaker-db` with `DB` binding | `d1_databases` block added with `database_id` |

**RED command**: `npm test` — tests 5–7 fail until migration and `wrangler.jsonc` exist.  
**GREEN command**: `npm test` — all 7 tests pass.

#### Implementation Tasks

1. Set up Vitest harness (`vitest.config.ts`, `npm test` scripts)
2. Write all Phase 1 tests and confirm RED
3. Run `npx wrangler d1 create quizmaker-db`
4. Add `d1_databases` binding (`DB`) to `wrangler.jsonc`
5. Run `npm run cf-typegen`
6. Create migration `create_users_table` with schema above
7. Apply locally: `npx wrangler d1 migrations apply quizmaker-db --local`
8. Confirm GREEN: `npm test`

#### Deliverables

- `vitest.config.ts`
- `src/lib/db/users-schema.ts`
- `src/lib/db/database-setup.test.ts`
- `wrangler.jsonc` updated with D1 binding
- `migrations/0001_create_users_table.sql`
- Local D1 database with `users` table

#### Phase Completion Checklist

- [ ] `npm test` — Phase 1 tests GREEN
- [ ] Acceptance: D1 configured in `wrangler.jsonc` with binding `DB`
- [ ] Acceptance: Migration creates `users` table with required columns and unique email index
- [ ] Committed and pushed to `feature/register-login-logout`
- [ ] User approval received before Phase 2

---

### Phase 2: User Service and Auth Utilities - PLANNED

**Objective**: Server-side logic for users and passwords without UI.

#### Test Plan (Vitest)

**Test files**:

| File | Subject under test |
|------|-------------------|
| `src/lib/auth/password.test.ts` | `src/lib/auth/password.ts` |
| `src/lib/auth/session.test.ts` | `src/lib/auth/session.ts` |
| `src/lib/services/user-service.test.ts` | `src/lib/services/user-service.ts` |
| `src/lib/config/env.test.ts` | `.dev.vars.example` documents `SESSION_SECRET` |

**`password.test.ts`** — starts RED until `password.ts` exists:

| # | Test | Expected behavior |
|---|------|-------------------|
| 1 | `hashPassword` returns a string different from the plaintext | bcrypt hash produced |
| 2 | `hashPassword` produces different hashes for the same input (salt) | two calls ≠ each other |
| 3 | `verifyPassword` returns true for correct plaintext + hash | login path works |
| 4 | `verifyPassword` returns false for wrong plaintext | rejects bad password |

**`session.test.ts`** — starts RED until `session.ts` exists:

| # | Test | Expected behavior |
|---|------|-------------------|
| 1 | `createSessionToken` returns a signed non-empty string | token created |
| 2 | `parseSessionToken` returns payload for valid token | `{ userId, email, exp }` decoded |
| 3 | `parseSessionToken` returns null for tampered token | rejects invalid signature |
| 4 | `parseSessionToken` returns null for expired token | rejects past `exp` |
| 5 | `getSessionCookieOptions` sets `httpOnly`, `sameSite: lax`, `path: /` | secure cookie defaults |

**`user-service.test.ts`** — starts RED until `user-service.ts` exists; mocks D1:

| # | Test | Expected behavior |
|---|------|-------------------|
| 1 | `createUser` inserts row and returns user without `password_hash` | happy path create |
| 2 | `createUser` normalizes email to lowercase | `Jane@School.edu` → `jane@school.edu` |
| 3 | `createUser` stores hashed password, not plaintext | hash ≠ plain in DB bind args |
| 4 | `getUserById` returns user when found | read by PK |
| 5 | `getUserById` returns null when not found | missing id |
| 6 | `getUserByEmail` returns user with hash for login | case-insensitive lookup |
| 7 | `updateUser` updates name fields | partial update |
| 8 | `updateUser` re-hashes password when password changes | new hash on password update |
| 9 | `deleteUser` executes delete statement | row removed |

**`env.test.ts`**:

| # | Test | Expected behavior |
|---|------|-------------------|
| 1 | `.dev.vars.example` contains `SESSION_SECRET` placeholder | documented for local dev |

**RED command**: `npm test` — all Phase 2 test files fail (modules missing).  
**GREEN command**: `npm test` — Phase 1 + Phase 2 tests pass.

#### Implementation Tasks

1. Write all Phase 2 tests and confirm RED
2. Add dependencies: `bcryptjs`, `zod`, `@types/bcryptjs`
3. Create user types and `user-service.ts` (CRUD + email lookup)
4. Create `password.ts` (hash + verify)
5. Create `session.ts` (sign token, parse token, cookie options)
6. Add `SESSION_SECRET` to `.dev.vars.example`
7. Confirm GREEN: `npm test`

#### Deliverables

- `src/lib/types/user.ts`
- `src/lib/services/user-service.ts` + `.test.ts`
- `src/lib/auth/password.ts` + `.test.ts`
- `src/lib/auth/session.ts` + `.test.ts`
- `src/lib/config/env.test.ts`
- `.dev.vars.example` updated

#### Phase Completion Checklist

- [ ] `npm test` — Phase 1 + 2 tests GREEN
- [ ] Acceptance: User service supports create, get by id, get by email, update, delete
- [ ] Acceptance: Passwords hashed with bcrypt; plaintext never in return values or bind args
- [ ] Committed and pushed to `feature/register-login-logout`
- [ ] User approval received before Phase 3

---

### Phase 3: Auth API Routes - PLANNED

**Objective**: HTTP endpoints for register, login, logout, and me.

#### Test Plan (Vitest)

**Test files** — each route handler tested in isolation with mocked `user-service`, `session`, and `cookies`:

| File | Route |
|------|-------|
| `src/app/api/auth/register/route.test.ts` | `POST /api/auth/register` |
| `src/app/api/auth/login/route.test.ts` | `POST /api/auth/login` |
| `src/app/api/auth/logout/route.test.ts` | `POST /api/auth/logout` |
| `src/app/api/auth/me/route.test.ts` | `GET /api/auth/me` |
| `src/lib/validations/auth.test.ts` | Zod schemas for request bodies |

**`auth.test.ts` (Zod schemas)** — starts RED until schemas exist:

| # | Test | Expected behavior |
|---|------|-------------------|
| 1 | register schema rejects missing `firstName` | 400-level validation |
| 2 | register schema rejects invalid email | format check |
| 3 | register schema rejects password < 8 chars | min length |
| 4 | login schema rejects missing email or password | required fields |

**`register/route.test.ts`**:

| # | Test | Expected behavior |
|---|------|-------------------|
| 1 | returns 201 and user JSON on success | happy path |
| 2 | sets `Set-Cookie` session header on success | session established |
| 3 | returns 400 for invalid body | Zod rejection |
| 4 | returns 409 when email already exists | duplicate registration |
| 5 | response never includes `password` or `password_hash` | security |

**`login/route.test.ts`**:

| # | Test | Expected behavior |
|---|------|-------------------|
| 1 | returns 200 and user JSON on valid credentials | happy path |
| 2 | sets session cookie on success | session established |
| 3 | returns 401 for unknown email | generic error message |
| 4 | returns 401 for wrong password | same message as unknown email |
| 5 | returns 400 for invalid body | validation |

**`logout/route.test.ts`**:

| # | Test | Expected behavior |
|---|------|-------------------|
| 1 | returns 200 and clears session cookie | logout happy path |
| 2 | cookie `Max-Age` is 0 or expiry in the past | cookie removed |

**`me/route.test.ts`**:

| # | Test | Expected behavior |
|---|------|-------------------|
| 1 | returns 200 and user when session valid | authenticated |
| 2 | returns 401 when no session cookie | unauthenticated |
| 3 | returns 401 when session token invalid | tampered cookie |

**RED command**: `npm test` — Phase 3 tests fail (routes and schemas missing).  
**GREEN command**: `npm test` — Phase 1 + 2 + 3 tests pass.

#### Implementation Tasks

1. Write all Phase 3 tests and confirm RED
2. Create Zod schemas in `src/lib/validations/auth.ts`
3. Implement `POST /api/auth/register`
4. Implement `POST /api/auth/login`
5. Implement `POST /api/auth/logout`
6. Implement `GET /api/auth/me`
7. Confirm GREEN: `npm test`

#### Deliverables

- `src/lib/validations/auth.ts` + `.test.ts`
- `src/app/api/auth/register/route.ts` + `.test.ts`
- `src/app/api/auth/login/route.ts` + `.test.ts`
- `src/app/api/auth/logout/route.ts` + `.test.ts`
- `src/app/api/auth/me/route.ts` + `.test.ts`

#### Phase Completion Checklist

- [ ] `npm test` — Phase 1 + 2 + 3 tests GREEN
- [ ] Acceptance: `POST /api/auth/register` creates user and sets session cookie
- [ ] Acceptance: `POST /api/auth/login` validates credentials and sets session cookie
- [ ] Acceptance: `POST /api/auth/logout` clears session cookie
- [ ] Acceptance: Duplicate email returns 409; invalid login returns 401 with generic message
- [ ] Committed and pushed to `feature/register-login-logout`
- [ ] User approval received before Phase 4

---

### Phase 4: Auth UI and MCQ Stub - PLANNED

**Objective**: Teachers can register, log in, land on MCQ stub, and log out.

#### Test Plan (Vitest)

Phase 4 adds React Testing Library for **client components** only. Server Components are not rendered in tests; their redirect logic is tested via extracted helper functions.

**Test files**:

| File | Subject under test |
|------|-------------------|
| `src/lib/auth/route-guards.test.ts` | Redirect helpers used by pages and middleware |
| `src/middleware.test.ts` | `src/middleware.ts` route protection |
| `src/components/auth/register-form.test.tsx` | Register form client component |
| `src/components/auth/login-form.test.tsx` | Login form client component |
| `src/components/auth/logout-button.test.tsx` | Logout button client component |

**`route-guards.test.ts`** — starts RED until helpers exist:

| # | Test | Expected behavior |
|---|------|-------------------|
| 1 | `shouldRedirectToMcq` returns true when session exists | authenticated user on `/login` |
| 2 | `shouldRedirectToLogin` returns true when no session | unauthenticated user on `/mcq` |
| 3 | `getAuthRedirectPath` returns `/mcq` after successful auth | post-login destination |

**`middleware.test.ts`**:

| # | Test | Expected behavior |
|---|------|-------------------|
| 1 | unauthenticated request to `/mcq` redirects to `/login` | route protection |
| 2 | authenticated request to `/mcq` passes through | allowed |
| 3 | authenticated request to `/login` redirects to `/mcq` | no double login |
| 4 | authenticated request to `/register` redirects to `/mcq` | no double register |
| 5 | public routes (`/`, `/login`, `/register`) pass when unauthenticated | open access |

**`register-form.test.tsx`**:

| # | Test | Expected behavior |
|---|------|-------------------|
| 1 | renders all required fields (first name, last name, email, password, confirm) | form present |
| 2 | shows validation error when passwords do not match | client validation |
| 3 | shows server error message on failed submit | error display |
| 4 | calls register API on valid submit | form submission |

**`login-form.test.tsx`**:

| # | Test | Expected behavior |
|---|------|-------------------|
| 1 | renders email and password fields | form present |
| 2 | shows generic error on 401 response | no email enumeration in UI |
| 3 | calls login API on valid submit | form submission |

**`logout-button.test.tsx`**:

| # | Test | Expected behavior |
|---|------|-------------------|
| 1 | renders a logout button | control present |
| 2 | calls logout API on click | session cleared |

**Note**: MCQ stub page (`/mcq`) welcome message is covered by middleware + route-guard tests and manual preview in Phase 5. Server Component pages are not rendered in Vitest.

**RED command**: `npm test` — Phase 4 tests fail (components and middleware missing).  
**GREEN command**: `npm test` — Phase 1 + 2 + 3 + 4 tests pass.

#### Implementation Tasks

1. Add React Testing Library dev dependencies (if not already installed)
2. Write all Phase 4 tests and confirm RED
3. Extract route-guard helpers to `src/lib/auth/route-guards.ts`
4. Build `RegisterForm` client component and `/register` page
5. Build `LoginForm` client component and `/login` page
6. Build `/mcq` stub page with welcome message and `LogoutButton`
7. Update `/` home with auth links and redirect logic
8. Add `src/middleware.ts` for route protection
9. Confirm GREEN: `npm test`

#### Deliverables

- `src/lib/auth/route-guards.ts` + `.test.ts`
- `src/components/auth/register-form.tsx` + `.test.tsx`
- `src/components/auth/login-form.tsx` + `.test.tsx`
- `src/components/auth/logout-button.tsx` + `.test.tsx`
- `src/app/register/page.tsx`
- `src/app/login/page.tsx`
- `src/app/mcq/page.tsx`
- Updated `src/app/page.tsx`
- `src/middleware.ts` + `.test.ts`

#### Phase Completion Checklist

- [ ] `npm test` — Phase 1 + 2 + 3 + 4 tests GREEN
- [ ] Acceptance: Register and login pages validate input and display server errors
- [ ] Acceptance: Successful register/login redirects to `/mcq`
- [ ] Acceptance: `/mcq` shows welcome with user name and logout control
- [ ] Acceptance: Unauthenticated `/mcq` redirects to `/login`
- [ ] Acceptance: Logout redirects to `/login` and blocks `/mcq` until re-login
- [ ] Committed and pushed to `feature/register-login-logout`
- [ ] User approval received before Phase 5

---

### Phase 5: Verification and Integration - PLANNED

**Objective**: Confirm the full feature meets acceptance criteria — automated suite green plus manual Workers-runtime smoke test.

#### Test Plan (Vitest + Manual)

**Automated** — no new unit tests required unless gaps found during verification. Phase 5 confirms the **cumulative suite** stays green:

| # | Check | Command / action |
|---|-------|------------------|
| 1 | Full Vitest suite passes | `npm test` — all Phase 1–4 tests GREEN |
| 2 | ESLint passes | `npm run lint` |
| 3 | Production build passes | `npm run build` |

**Manual smoke test** (Workers runtime via `npm run preview`):

| # | Scenario | Expected result |
|---|----------|-----------------|
| 1 | Register new teacher | Lands on `/mcq` with welcome message |
| 2 | Logout | Redirected to `/login`; `/mcq` blocked |
| 3 | Login with same credentials | Lands on `/mcq` |
| 4 | Refresh `/mcq` while logged in | Session persists |
| 5 | Register duplicate email | 409 error shown on register page |
| 6 | Login with wrong password | Generic error; no email hint |
| 7 | Inspect D1 local row after register | `password_hash` present; no plaintext password |

Document any manual-test failures in the Troubleshooting Guide.

#### Implementation Tasks

1. Run `npm test` — confirm all phases GREEN
2. Run `npm run lint` and fix issues
3. Run `npm run build` and fix issues
4. Run `npm run preview` and execute manual smoke checklist
5. Mark all acceptance criteria complete in this PRD
6. Update phase status markers to COMPLETED

#### Deliverables

- Full Vitest suite green (`npm test`)
- Passing lint and build
- Manual smoke test notes (if any issues found and fixed)
- All acceptance criteria checkboxes marked done

#### Phase Completion Checklist

- [ ] `npm test` — entire suite GREEN (Phases 1–4)
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Manual smoke test checklist completed on `npm run preview`
- [ ] All acceptance criteria marked complete
- [ ] Final commit pushed to `feature/register-login-logout`
- [ ] Feature ready for PR / merge review

---

## Technical Implementation Details

### Key Files

| File | Purpose |
|------|---------|
| `wrangler.jsonc` | D1 database binding configuration |
| `migrations/0001_create_users_table.sql` | Users table schema |
| `src/lib/services/user-service.ts` | CRUD and lookup for users |
| `src/lib/auth/password.ts` | bcrypt hash and verify |
| `src/lib/auth/session.ts` | Cookie-based session create/validate/clear |
| `src/app/api/auth/*/route.ts` | Register, login, logout, me endpoints |
| `src/app/register/page.tsx` | Registration form |
| `src/app/login/page.tsx` | Login form |
| `src/app/mcq/page.tsx` | Post-auth MCQ workspace stub |
| `src/middleware.ts` | Protect `/mcq`, redirect authenticated users from auth pages |
| `vitest.config.ts` | Vitest test runner configuration |
| `src/**/*.test.ts` | Unit tests colocated with source modules |
| `src/**/*.test.tsx` | React component tests (Phase 4) |

### Implementation Patterns

**D1 access (from route handler or service):**
```typescript
import { getCloudflareContext } from "@opennextjs/cloudflare";

const { env } = await getCloudflareContext();
const { results } = await env.DB.prepare(
  "SELECT id, first_name, last_name, email FROM users WHERE email = ?1 COLLATE NOCASE"
)
  .bind(normalizedEmail)
  .all();
const user = results[0] ?? null;
```

**Password hashing:**
```typescript
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

**Session cookie (HTTP-only, Secure in production, SameSite=Lax):**
```typescript
// Set after successful register/login
cookies().set("session", signedToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
});
```

### Important Notes

- D1 is only reachable from server code. Never import `user-service` into `'use client'` components.
- Always use numbered placeholders (`?1`, `?2`) in D1 prepared statements.
- Normalize email to lowercase before storage and lookup.
- Never return `password_hash` in API responses or UI.
- `npm run dev` uses Node and may not surface D1 binding issues; verify auth flows with `npm run preview`.
- Do not run `migrations apply --remote` from agent sessions; remote schema changes are the user's decision.
- `package-lock.json` is generated; run `npm install` after adding dependencies rather than hand-editing the lockfile.

---

## Acceptance Criteria

Each item is proven by Vitest (automated) and/or manual preview (Phase 5). See phase test plans above for mapping.

- [ ] D1 database is configured in `wrangler.jsonc` with binding `DB` *(Phase 1 tests)*
- [ ] Migration creates `users` table with required columns and unique email index *(Phase 1 tests)*
- [ ] User service supports create, get by id, get by email, update, and delete *(Phase 2 tests)*
- [ ] Passwords are hashed with bcrypt before storage; plaintext never written to D1 *(Phase 2 tests)*
- [ ] `POST /api/auth/register` creates a user and sets a session cookie *(Phase 3 tests)*
- [ ] `POST /api/auth/login` validates credentials and sets a session cookie *(Phase 3 tests)*
- [ ] `POST /api/auth/logout` clears the session cookie *(Phase 3 tests)*
- [ ] Duplicate email registration returns 409 with a clear error message *(Phase 3 tests)*
- [ ] Invalid login returns 401 with a generic error (no email enumeration) *(Phase 3 tests)*
- [ ] Register and login pages validate input and display server errors *(Phase 4 tests)*
- [ ] Successful register or login redirects the user to `/mcq` *(Phase 4 tests + manual)*
- [ ] `/mcq` shows a welcome message with the user's name and a logout control *(Phase 4 + manual)*
- [ ] Unauthenticated access to `/mcq` redirects to `/login` *(Phase 4 tests)*
- [ ] Logout redirects to `/login` and prevents access to `/mcq` until login again *(Phase 4 tests + manual)*
- [ ] `npm test` passes — full Vitest suite green *(Phase 5)*
- [ ] `npm run lint` passes *(Phase 5)*
- [ ] `npm run build` passes *(Phase 5)*

---

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Registration completion | User reaches `/mcq` after register | Manual test / preview session |
| Login success rate | Valid credentials always reach `/mcq` | Manual test with seeded user |
| Password security | Zero plaintext passwords in D1 | Inspect local D1 rows after register |
| Session persistence | Refresh on `/mcq` keeps user signed in | Browser reload test |
| Logout effectiveness | Cookie cleared; `/mcq` redirects to login | DevTools cookie inspection |

---

## Dependencies

### External Dependencies

| Dependency | Purpose | Status |
|------------|---------|--------|
| Cloudflare D1 | User persistence | Must be created and bound |
| `bcryptjs` | Password hashing (Workers-compatible) | To be added (Phase 2) |
| `zod` | Request/form validation | To be added (Phase 3) |
| `vitest` | Unit test runner | To be added (Phase 1) |
| `vite-tsconfig-paths` | `@/` alias in tests | To be added (Phase 1) |
| `@testing-library/react` | Client component tests | To be added (Phase 4) |

### Internal Dependencies

| Module | Purpose |
|--------|---------|
| `@opennextjs/cloudflare` | Access `env.DB` via `getCloudflareContext()` |
| shadcn/ui components | Auth form UI |
| `.dev.vars` / `SESSION_SECRET` | Signing session cookies locally |

### Environment Variables

| Variable | Location | Purpose |
|----------|----------|---------|
| `SESSION_SECRET` | `.dev.vars` (local), Wrangler secret (prod) | HMAC signing key for session cookie |

Add placeholder to `.dev.vars.example`:
```
SESSION_SECRET=
```

---

## Risks and Mitigation

### Technical Risks

- **Risk**: D1 binding unavailable in `npm run dev` (Node runtime)
- **Mitigation**: Document that full auth testing requires `npm run preview`; use preview for acceptance testing

- **Risk**: bcrypt performance on Workers cold starts
- **Mitigation**: Use `bcryptjs` with SALT_ROUNDS=10; acceptable for auth frequency in a teacher tool

- **Risk**: Session secret missing locally causes cryptic errors
- **Mitigation**: Fail fast with clear error if `SESSION_SECRET` is unset; document in `.dev.vars.example`

### User Experience Risks

- **Risk**: Teachers confuse register vs login flows
- **Mitigation**: Cross-links on both pages; redirect authenticated users away from auth pages

- **Risk**: Weak passwords
- **Mitigation**: Enforce minimum 8 characters in this phase; document stronger rules as future work

---

## Troubleshooting Guide

### D1 binding not found at runtime

**Problem**: `env.DB` is undefined or type errors after adding binding  
**Cause**: `cf-typegen` not run, or testing with `npm run dev` instead of preview  
**Solution**: Run `npm run cf-typegen`; test with `npm run preview`  
**Code Reference**: `wrangler.jsonc`

### Migration apply fails locally

**Problem**: `wrangler d1 migrations apply` errors  
**Cause**: Database name mismatch or migration SQL syntax error  
**Solution**: Verify database name matches `wrangler.jsonc`; inspect SQL file  
**Code Reference**: `migrations/0001_create_users_table.sql`

### Login always fails with valid credentials

**Problem**: 401 on login after successful register  
**Cause**: Email case mismatch or password compare against wrong field  
**Solution**: Normalize email to lowercase on write and read; ensure comparing against `password_hash`  
**Code Reference**: `src/lib/services/user-service.ts`

---

## Development Workflow

### Feature Branch

All work for this feature lives on branch `feature/register-login-logout`. Each completed phase is committed and pushed to this branch before requesting permission to start the next phase.

### Phased Delivery with Approval Gate

Implementation proceeds **one phase at a time**. After each phase:

1. Write failing tests first (**RED**)
2. Implement the minimum code to pass tests (**GREEN**)
3. Run `npm test`, `npm run lint`, and `npm run build`
4. Commit and push to `feature/register-login-logout`
5. Report phase completion and **wait for explicit user approval** before starting the next phase

Do not begin Phase N+1 until the user confirms (e.g. "go for Phase 2").

### Test-Driven Development (TDD)

Every phase follows Red → Green. See **Testing Strategy (Vitest + TDD)** above for the full harness setup, mocking conventions, and per-phase test tables.

| Step | Action | Signal |
|------|--------|--------|
| RED | Write phase tests before implementation | `npm test` fails for new tests |
| GREEN | Implement minimum code to pass | `npm test` passes for current + prior phases |
| Verify | lint, build, push branch | Phase completion checklist all checked |
| Gate | Report to user and wait | Explicit approval before next phase |

---

## Notes for AI Agents

When working with this PRD:

1. Start by reading the Problem and Hypothesis to understand intent
2. Use Scope (In/Out/Cut) to determine boundaries — do not build MCQ CRUD or password reset
3. **Follow the phased workflow above** — complete one phase, push, then wait for user approval
4. **Write failing tests before implementation** for every phase (TDD Red → Green)
5. Update phase status markers as work progresses
6. Add implementation details under "Technical Implementation Details" as code is written
7. Mark acceptance criteria as complete when features work
8. Add troubleshooting entries when bugs are found and fixed
9. Ask before adding dependencies not listed here
10. Never apply D1 migrations to remote; local `--local` only
11. Run `npm test`, `npm run lint`, and `npm run build` before claiming phase completion
12. Use code references format: `filepath:line-number` when citing code

---

## Current Status

**Last Updated**: September 1, 2026  
**Feature Branch**: `feature/register-login-logout`  
**Current Phase**: Phase 1 - Database Setup  
**Status**: PLANNED  
**Next Steps**: Set up Vitest → write Phase 1 tests (RED) → implement D1 + migration (GREEN) → push branch → await approval for Phase 2
