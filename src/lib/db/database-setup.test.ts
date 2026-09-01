import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
	D1_BINDING_NAME,
	D1_DATABASE_NAME,
	USER_COLUMNS,
	USER_INDEXES,
	USERS_TABLE,
	USERS_TABLE_DDL,
} from "@/lib/db/users-schema";

const projectRoot = join(import.meta.dirname, "../../..");

function readWranglerConfig(): string {
	return readFileSync(join(projectRoot, "wrangler.jsonc"), "utf-8");
}

function findUsersMigrationFile(): string | undefined {
	const migrationsDir = join(projectRoot, "migrations");
	const files = readdirSync(migrationsDir);
	return files.find((file) => file.endsWith("_create_users_table.sql"));
}

describe("Phase 1: Database Setup", () => {
	describe("users schema definition", () => {
		it("defines the users table name", () => {
			expect(USERS_TABLE).toBe("users");
		});

		it("defines all required user columns", () => {
			expect(USER_COLUMNS).toEqual([
				"id",
				"first_name",
				"last_name",
				"email",
				"password_hash",
				"created_at",
				"updated_at",
			]);
		});

		it("defines the email index", () => {
			expect(USER_INDEXES).toContain("idx_users_email");
		});

		it("includes every column in the DDL", () => {
			for (const column of USER_COLUMNS) {
				expect(USERS_TABLE_DDL).toContain(column);
			}
		});
	});

	describe("migration file", () => {
		it("exists with create_users_table in the filename", () => {
			expect(findUsersMigrationFile()).toBeDefined();
		});

		it("creates the users table with required columns and index", () => {
			const migrationFile = findUsersMigrationFile();
			expect(migrationFile).toBeDefined();

			const sql = readFileSync(join(projectRoot, "migrations", migrationFile!), "utf-8");

			expect(sql).toMatch(/CREATE TABLE\s+users/i);
			for (const column of USER_COLUMNS) {
				expect(sql).toContain(column);
			}
			expect(sql).toMatch(/CREATE INDEX\s+idx_users_email\s+ON\s+users/i);
			expect(sql).toMatch(/email\s+TEXT\s+NOT NULL\s+UNIQUE/i);
		});
	});

	describe("wrangler D1 binding", () => {
		it("configures quizmaker-db with DB binding", () => {
			const config = readWranglerConfig();

			expect(config).toMatch(/"d1_databases"\s*:/);
			expect(config).toContain(`"database_name": "${D1_DATABASE_NAME}"`);
			expect(config).toContain(`"binding": "${D1_BINDING_NAME}"`);
			expect(config).toMatch(/"database_id"\s*:\s*"[a-f0-9-]+"/i);
		});
	});
});
