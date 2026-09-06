export const MCQS_TABLE = "mcqs" as const;
export const MCQ_CHOICES_TABLE = "mcq_choices" as const;
export const MCQ_ATTEMPTS_TABLE = "mcq_attempts" as const;

export const MCQ_COLUMNS = [
	"id",
	"name",
	"question",
	"created_by_user_id",
	"created_at",
	"updated_at",
] as const;

export const MCQ_CHOICE_COLUMNS = [
	"id",
	"mcq_id",
	"choice_text",
	"is_correct",
	"sort_order",
	"created_at",
	"updated_at",
] as const;

export const MCQ_ATTEMPT_COLUMNS = [
	"id",
	"mcq_id",
	"user_id",
	"choice_id",
	"is_correct",
	"created_at",
] as const;

export const MCQ_INDEXES = ["idx_mcqs_created_by_user_id"] as const;
export const MCQ_CHOICE_INDEXES = ["idx_mcq_choices_mcq_id"] as const;
export const MCQ_ATTEMPT_INDEXES = ["idx_mcq_attempts_mcq_id", "idx_mcq_attempts_user_id"] as const;

export const D1_DATABASE_NAME = "quizmaker-db" as const;
export const D1_BINDING_NAME = "DB" as const;

export const MCQS_TABLES_DDL = `
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
`.trim();
