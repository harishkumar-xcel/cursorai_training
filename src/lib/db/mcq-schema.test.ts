import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
	MCQ_ATTEMPT_COLUMNS,
	MCQ_ATTEMPT_INDEXES,
	MCQ_CHOICE_COLUMNS,
	MCQ_CHOICE_INDEXES,
	MCQ_COLUMNS,
	MCQ_INDEXES,
	MCQ_ATTEMPTS_TABLE,
	MCQ_CHOICES_TABLE,
	MCQS_TABLE,
	MCQS_TABLES_DDL,
} from "@/lib/db/mcq-schema";

const projectRoot = join(import.meta.dirname, "../../..");

function findMcqMigrationFile(): string | undefined {
	const migrationsDir = join(projectRoot, "migrations");
	const files = readdirSync(migrationsDir);
	return files.find((file) => file.endsWith("_create_mcqs_tables.sql"));
}

describe("MCQ schema definition", () => {
	it("defines table names", () => {
		expect(MCQS_TABLE).toBe("mcqs");
		expect(MCQ_CHOICES_TABLE).toBe("mcq_choices");
		expect(MCQ_ATTEMPTS_TABLE).toBe("mcq_attempts");
	});

	it("defines mcq columns", () => {
		expect(MCQ_COLUMNS).toEqual([
			"id",
			"name",
			"question",
			"created_by_user_id",
			"created_at",
			"updated_at",
		]);
	});

	it("defines choice columns", () => {
		expect(MCQ_CHOICE_COLUMNS).toContain("mcq_id");
		expect(MCQ_CHOICE_COLUMNS).toContain("is_correct");
	});

	it("defines attempt columns", () => {
		expect(MCQ_ATTEMPT_COLUMNS).toContain("choice_id");
		expect(MCQ_ATTEMPT_COLUMNS).toContain("is_correct");
	});

	it("defines indexes", () => {
		expect(MCQ_INDEXES).toContain("idx_mcqs_created_by_user_id");
		expect(MCQ_CHOICE_INDEXES).toContain("idx_mcq_choices_mcq_id");
		expect(MCQ_ATTEMPT_INDEXES).toContain("idx_mcq_attempts_mcq_id");
		expect(MCQ_ATTEMPT_INDEXES).toContain("idx_mcq_attempts_user_id");
	});

	it("includes every column in the DDL", () => {
		for (const column of [...MCQ_COLUMNS, ...MCQ_CHOICE_COLUMNS, ...MCQ_ATTEMPT_COLUMNS]) {
			expect(MCQS_TABLES_DDL).toContain(column);
		}
	});
});

describe("MCQ migration file", () => {
	it("exists with create_mcqs_tables in the filename", () => {
		expect(findMcqMigrationFile()).toBeDefined();
	});

	it("creates all tables with required columns and indexes", () => {
		const migrationFile = findMcqMigrationFile();
		expect(migrationFile).toBeDefined();

		const sql = readFileSync(join(projectRoot, "migrations", migrationFile!), "utf-8");

		expect(sql).toMatch(/CREATE TABLE\s+mcqs/i);
		expect(sql).toMatch(/CREATE TABLE\s+mcq_choices/i);
		expect(sql).toMatch(/CREATE TABLE\s+mcq_attempts/i);

		for (const column of MCQ_COLUMNS) {
			expect(sql).toContain(column);
		}

		expect(sql).toMatch(/CREATE INDEX\s+idx_mcqs_created_by_user_id/i);
		expect(sql).toMatch(/ON DELETE CASCADE/i);
	});
});
