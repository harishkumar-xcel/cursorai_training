export const USERS_TABLE = "users" as const;

export const USER_COLUMNS = [
	"id",
	"first_name",
	"last_name",
	"email",
	"password_hash",
	"created_at",
	"updated_at",
] as const;

export const USER_INDEXES = ["idx_users_email"] as const;

export const D1_DATABASE_NAME = "quizmaker-db" as const;
export const D1_BINDING_NAME = "DB" as const;

export const USERS_TABLE_DDL = `
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
`.trim();
