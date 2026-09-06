Date created: September 6, 2026
Date last modified: September 6, 2026

# Multiple Choice Questions CRUD - Technical PRD

## Overview/Problem

Teachers using GreenField Quiz Maker can register and sign in, but the MCQ workspace is still a placeholder. They cannot create, edit, or delete multiple-choice questions, nor record practice attempts. Without question persistence, the product cannot deliver its core value: building and managing personal question banks.

This PRD covers the first MCQ vertical slice: three related D1 tables (questions, choices, attempts), a service layer, authenticated API routes, and a shadcn-based UI for listing, creating, editing, previewing, and deleting questions.

---

## Hypothesis

We believe that providing authenticated CRUD for multiple-choice questions with a clear list-and-form UI will let teachers build personal question banks and validate the data model before quiz publishing features.

---

## Scope

### In Scope

- D1 migration for `mcqs`, `mcq_choices`, and `mcq_attempts` tables
- MCQ service in `src/lib/services/mcq-service.ts` with create, read, update, delete, and attempt recording
- API routes under `src/app/api/mcqs/` scoped to the authenticated user
- MCQ list page (`/mcq`) with shadcn table, row actions (edit, preview, delete), and create button
- Create/edit page (`/mcq/new`, `/mcq/[id]/edit`) with save and cancel
- Preview page (`/mcq/[id]/preview`) to answer a question and record an attempt
- Zod validation for all API inputs
- Vitest unit tests for schema, validation, service, routes, and key client components
- shadcn components: table, button, dropdown-menu, textarea, alert-dialog, field, card

### Out of Scope

- Sharing questions between teachers or public question banks
- Quiz assembly, publishing, or timed assessments
- Bulk import/export of questions
- Rich text or image attachments in questions
- Analytics dashboards for attempt history
- Remote D1 migration apply or production deployment

### Cut

- **Inline create/edit dialog on list page** — A dedicated form page keeps the create/edit flow simpler and matches the user's request for a separate page with save/cancel.
- **Server Actions** — API routes mirror the auth slice for consistency and HTTP-level testability.

---

## Technical Requirements

### Database Schema

Database name (Wrangler): `quizmaker-db`  
Binding name: `DB`

```sql
CREATE TABLE mcqs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  question TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE INDEX idx_mcqs_created_by_user_id ON mcqs (created_by_user_id);

CREATE TABLE mcq_choices (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  mcq_id TEXT NOT NULL,
  choice_text TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mcq_id) REFERENCES mcqs(id) ON DELETE CASCADE
);

CREATE INDEX idx_mcq_choices_mcq_id ON mcq_choices (mcq_id);

CREATE TABLE mcq_attempts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  mcq_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  choice_id TEXT NOT NULL,
  is_correct INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mcq_id) REFERENCES mcqs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (choice_id) REFERENCES mcq_choices(id)
);

CREATE INDEX idx_mcq_attempts_mcq_id ON mcq_attempts (mcq_id);
CREATE INDEX idx_mcq_attempts_user_id ON mcq_attempts (user_id);
```

| Table | Column | Type | Notes |
|-------|--------|------|-------|
| `mcqs` | `id` | TEXT PK | Opaque hex string |
| `mcqs` | `name` | TEXT NOT NULL | Short title shown in list |
| `mcqs` | `question` | TEXT NOT NULL | Full question prompt |
| `mcqs` | `created_by_user_id` | TEXT NOT NULL | FK to `users.id` |
| `mcq_choices` | `is_correct` | INTEGER | SQLite boolean (0/1) |
| `mcq_choices` | `sort_order` | INTEGER | Display order (0-based) |
| `mcq_attempts` | `is_correct` | INTEGER | Whether selected choice was correct |

Migration file: `migrations/0002_create_mcqs_tables.sql`

### API Endpoints

All MCQ endpoints require an authenticated session. Requests are validated with Zod before calling the MCQ service.

#### GET /api/mcqs

Lists all MCQs owned by the current user (without choices).

**Response:**

- Success (200): `{ "mcqs": [ { "id", "name", "question", "createdAt", "updatedAt" } ] }`
- Error (401): Not authenticated
- Error (500/503): Server error

---

#### POST /api/mcqs

Creates a new MCQ with choices.

**Request Body:**

```json
{
  "name": "Photosynthesis basics",
  "question": "What gas do plants absorb during photosynthesis?",
  "choices": [
    { "choiceText": "Carbon dioxide", "isCorrect": true },
    { "choiceText": "Oxygen", "isCorrect": false }
  ]
}
```

**Validation:**

- `name`: non-empty, max 200 characters
- `question`: non-empty, max 2000 characters
- `choices`: 2–6 items; exactly one `isCorrect: true`; each `choiceText` non-empty, max 500 characters

**Response:**

- Success (201): `{ "mcq": { ...full mcq with choices } }`
- Error (400): Validation error
- Error (401): Not authenticated

---

#### GET /api/mcqs/[id]

Returns one MCQ with choices. For preview, `isCorrect` is omitted from choices unless `?includeAnswers=true`.

**Response:**

- Success (200): `{ "mcq": { ... } }`
- Error (401): Not authenticated
- Error (404): Not found or not owned by user

---

#### PUT /api/mcqs/[id]

Replaces MCQ fields and choices.

**Request Body:** Same shape as POST (without `id`).

**Response:**

- Success (200): `{ "mcq": { ... } }`
- Error (400/401/404): As above

---

#### DELETE /api/mcqs/[id]

Deletes an MCQ and cascades to choices and attempts.

**Response:**

- Success (200): `{ "success": true }`
- Error (401/404): As above

---

#### POST /api/mcqs/[id]/attempts

Records a practice attempt for the current user.

**Request Body:**

```json
{
  "choiceId": "abc123"
}
```

**Response:**

- Success (201): `{ "attempt": { "id", "mcqId", "choiceId", "isCorrect", "createdAt" } }`
- Error (400/401/404): Validation, auth, or not found

---

### User Interface Requirements

#### MCQ List (`/mcq`)

- Header with welcome message and logout
- "Create question" button → `/mcq/new`
- shadcn table: Name, Question, Actions
- Actions column: vertical ellipsis dropdown with Edit, Preview, Delete
- Delete uses alert-dialog confirmation

#### Create / Edit (`/mcq/new`, `/mcq/[id]/edit`)

- Fields: Name, Question (textarea)
- Choices: 2 default rows; add up to 6; remove down to 2
- Each choice: text input + radio/checkbox for correct answer (exactly one correct)
- Save (POST or PUT) and Cancel (back to `/mcq`)

#### Preview (`/mcq/[id]/preview`)

- Shows question and choices (no correct answer revealed until submit)
- Submit records attempt via API and shows correct/incorrect feedback

---

## Implementation Phases

### Phase 1: Database & Schema - COMPLETED

**Objective**: Persist MCQs, choices, and attempts in D1.

**Tasks**:

1. Create migration `0002_create_mcqs_tables.sql` ✅
2. Add `src/lib/db/mcq-schema.ts` mirroring DDL ✅
3. Add `src/lib/db/mcq-schema.test.ts` ✅
4. Apply migration locally ✅

### Phase 2: Service Layer & Validation - COMPLETED

**Objective**: Encapsulate D1 access and input validation.

**Tasks**:

1. `src/lib/types/mcq.ts` ✅
2. `src/lib/validations/mcq.ts` + tests ✅
3. `src/lib/services/mcq-service.ts` + tests ✅

### Phase 3: API Routes - COMPLETED

**Objective**: Expose authenticated HTTP endpoints.

**Tasks**:

1. `src/app/api/mcqs/route.ts` (GET, POST) ✅
2. `src/app/api/mcqs/[id]/route.ts` (GET, PUT, DELETE) ✅
3. `src/app/api/mcqs/[id]/attempts/route.ts` (POST) ✅
4. Route unit tests ✅

### Phase 4: Frontend - COMPLETED

**Objective**: Replace MCQ stub with full CRUD UI.

**Tasks**:

1. Install shadcn dropdown-menu, textarea, checkbox; use dialog for delete confirmation ✅
2. `mcq-list.tsx`, `mcq-form.tsx`, `mcq-preview.tsx`, `mcq-page-header.tsx` ✅
3. Pages under `src/app/mcq/` ✅
4. Update middleware for `/mcq/*` protection ✅
5. Component tests ✅

---

## Technical Implementation Details

### Key Files

- `src/lib/db/mcq-schema.ts` — Table constants and DDL mirror
- `src/lib/services/mcq-service.ts` — All D1 access for MCQs
- `src/lib/validations/mcq.ts` — Zod schemas for create/update/attempt
- `src/app/api/mcqs/` — REST handlers
- `src/components/mcq-list.tsx` — Client table with actions
- `src/components/mcq-form.tsx` — Create/edit form
- `src/components/mcq-preview.tsx` — Preview and attempt submission

### Implementation Patterns

- Service maps snake_case rows to camelCase domain types
- Ownership enforced via `created_by_user_id` on every read/write
- Choices replaced on update (delete existing, insert new) for simplicity
- SQLite booleans stored as `INTEGER` 0/1

---

## Acceptance Criteria

- [x] Authenticated user sees a table of their MCQs on `/mcq`
- [x] User can create an MCQ with 2–6 choices and exactly one correct answer
- [x] User can edit an existing MCQ and save changes
- [x] User can delete an MCQ after confirmation
- [x] User can preview a question and submit an attempt; API records correct/incorrect
- [x] Unauthenticated users cannot access `/mcq` or sub-routes
- [x] All new code covered by Vitest unit tests; `npm run test`, `npm run lint`, and `npm run build` pass

---

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Question creation | User can save a valid MCQ in under 2 minutes | Manual test |
| Data integrity | Choices always belong to parent MCQ | FK constraints + service tests |
| Test coverage | Schema, service, routes, and key UI tested | `npm run test` green |

---

## Dependencies

### Internal Dependencies

- User auth session (`getSessionPayloadFromCookies`)
- D1 binding `DB` in `wrangler.jsonc`
- shadcn/ui components (table, button, field, card, dialog)

### External Dependencies

- Cloudflare D1 (local via Wrangler)

---

## Risks and Mitigation

### Technical Risks

- **Risk**: Choice update leaves orphaned rows  
- **Mitigation**: Replace-all strategy on update; `ON DELETE CASCADE` on FKs

### User Experience Risks

- **Risk**: User marks multiple choices correct  
- **Mitigation**: Zod validates exactly one `isCorrect: true`; UI uses radio semantics

---

## Current Status

**Last Updated**: September 6, 2026  
**Current Phase**: Complete  
**Status**: COMPLETED  
**Next Steps**: Manual verification with `npm run preview` locally; consider quiz assembly features next
