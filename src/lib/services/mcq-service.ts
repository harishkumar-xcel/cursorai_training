import { getCloudflareContext } from "@opennextjs/cloudflare";

import {
	MCQ_ATTEMPTS_TABLE,
	MCQ_CHOICES_TABLE,
	MCQS_TABLE,
} from "@/lib/db/mcq-schema";
import type {
	CreateAttemptInput,
	CreateMcqInput,
	Mcq,
	McqAttempt,
	McqChoice,
	McqChoiceInput,
	McqSummary,
	McqWithChoices,
	UpdateMcqInput,
} from "@/lib/types/mcq";

type McqRow = {
	id: string;
	name: string;
	question: string;
	created_by_user_id: string;
	created_at: string;
	updated_at: string;
};

type McqChoiceRow = {
	id: string;
	mcq_id: string;
	choice_text: string;
	is_correct: number;
	sort_order: number;
	created_at: string;
	updated_at: string;
};

type McqAttemptRow = {
	id: string;
	mcq_id: string;
	user_id: string;
	choice_id: string;
	is_correct: number;
	created_at: string;
};

function mapMcqRow(row: McqRow): Mcq {
	return {
		id: row.id,
		name: row.name,
		question: row.question,
		createdByUserId: row.created_by_user_id,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function mapMcqSummary(row: McqRow): McqSummary {
	return {
		id: row.id,
		name: row.name,
		question: row.question,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function mapChoiceRow(row: McqChoiceRow): McqChoice {
	return {
		id: row.id,
		choiceText: row.choice_text,
		isCorrect: row.is_correct === 1,
		sortOrder: row.sort_order,
	};
}

function mapAttemptRow(row: McqAttemptRow): McqAttempt {
	return {
		id: row.id,
		mcqId: row.mcq_id,
		userId: row.user_id,
		choiceId: row.choice_id,
		isCorrect: row.is_correct === 1,
		createdAt: row.created_at,
	};
}

async function getDb(): Promise<D1Database> {
	const { env } = await getCloudflareContext();
	return env.DB;
}

async function getChoicesForMcq(mcqId: string): Promise<McqChoice[]> {
	const db = await getDb();

	const { results } = await db
		.prepare(
			`SELECT id, mcq_id, choice_text, is_correct, sort_order, created_at, updated_at
       FROM ${MCQ_CHOICES_TABLE}
       WHERE mcq_id = ?1
       ORDER BY sort_order ASC`,
		)
		.bind(mcqId)
		.all<McqChoiceRow>();

	return results.map(mapChoiceRow);
}

async function insertChoices(mcqId: string, choices: McqChoiceInput[]): Promise<McqChoice[]> {
	const db = await getDb();
	const insertedChoices: McqChoice[] = [];

	for (const [index, choice] of choices.entries()) {
		const { results } = await db
			.prepare(
				`INSERT INTO ${MCQ_CHOICES_TABLE} (mcq_id, choice_text, is_correct, sort_order)
         VALUES (?1, ?2, ?3, ?4)
         RETURNING id, mcq_id, choice_text, is_correct, sort_order, created_at, updated_at`,
			)
			.bind(mcqId, choice.choiceText, choice.isCorrect ? 1 : 0, index)
			.all<McqChoiceRow>();

		const row = results[0];

		if (!row) {
			throw new Error("Failed to create choice");
		}

		insertedChoices.push(mapChoiceRow(row));
	}

	return insertedChoices;
}

export async function listMcqsByUserId(userId: string): Promise<McqSummary[]> {
	const db = await getDb();

	const { results } = await db
		.prepare(
			`SELECT id, name, question, created_by_user_id, created_at, updated_at
       FROM ${MCQS_TABLE}
       WHERE created_by_user_id = ?1
       ORDER BY updated_at DESC`,
		)
		.bind(userId)
		.all<McqRow>();

	return results.map(mapMcqSummary);
}

export async function getMcqById(
	id: string,
	userId: string,
	options: { includeAnswers?: boolean } = {},
): Promise<McqWithChoices | null> {
	const db = await getDb();

	const { results } = await db
		.prepare(
			`SELECT id, name, question, created_by_user_id, created_at, updated_at
       FROM ${MCQS_TABLE}
       WHERE id = ?1 AND created_by_user_id = ?2`,
		)
		.bind(id, userId)
		.all<McqRow>();

	const row = results[0];

	if (!row) {
		return null;
	}

	const choices = await getChoicesForMcq(id);

	return {
		...mapMcqRow(row),
		choices: options.includeAnswers
			? choices
			: choices.map((choice) => ({
					...choice,
					isCorrect: false,
				})),
	};
}

export async function createMcq(userId: string, input: CreateMcqInput): Promise<McqWithChoices> {
	const db = await getDb();

	const { results } = await db
		.prepare(
			`INSERT INTO ${MCQS_TABLE} (name, question, created_by_user_id)
       VALUES (?1, ?2, ?3)
       RETURNING id, name, question, created_by_user_id, created_at, updated_at`,
		)
		.bind(input.name, input.question, userId)
		.all<McqRow>();

	const row = results[0];

	if (!row) {
		throw new Error("Failed to create MCQ");
	}

	const choices = await insertChoices(row.id, input.choices);

	return {
		...mapMcqRow(row),
		choices,
	};
}

export async function updateMcq(
	id: string,
	userId: string,
	input: UpdateMcqInput,
): Promise<McqWithChoices> {
	const existing = await getMcqById(id, userId, { includeAnswers: true });

	if (!existing) {
		throw new Error("MCQ not found");
	}

	const db = await getDb();

	const { results } = await db
		.prepare(
			`UPDATE ${MCQS_TABLE}
       SET name = ?1,
           question = ?2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?3 AND created_by_user_id = ?4
       RETURNING id, name, question, created_by_user_id, created_at, updated_at`,
		)
		.bind(input.name, input.question, id, userId)
		.all<McqRow>();

	const row = results[0];

	if (!row) {
		throw new Error("MCQ not found");
	}

	await db.prepare(`DELETE FROM ${MCQ_CHOICES_TABLE} WHERE mcq_id = ?1`).bind(id).run();

	const choices = await insertChoices(id, input.choices);

	return {
		...mapMcqRow(row),
		choices,
	};
}

export async function deleteMcq(id: string, userId: string): Promise<void> {
	const db = await getDb();

	const result = await db
		.prepare(`DELETE FROM ${MCQS_TABLE} WHERE id = ?1 AND created_by_user_id = ?2`)
		.bind(id, userId)
		.run();

	if (result.meta.changes === 0) {
		throw new Error("MCQ not found");
	}
}

export async function createAttempt(
	mcqId: string,
	userId: string,
	input: CreateAttemptInput,
): Promise<McqAttempt> {
	const mcq = await getMcqById(mcqId, userId, { includeAnswers: true });

	if (!mcq) {
		throw new Error("MCQ not found");
	}

	const selectedChoice = mcq.choices.find((choice) => choice.id === input.choiceId);

	if (!selectedChoice) {
		throw new Error("Choice not found");
	}

	const db = await getDb();

	const { results } = await db
		.prepare(
			`INSERT INTO ${MCQ_ATTEMPTS_TABLE} (mcq_id, user_id, choice_id, is_correct)
       VALUES (?1, ?2, ?3, ?4)
       RETURNING id, mcq_id, user_id, choice_id, is_correct, created_at`,
		)
		.bind(mcqId, userId, input.choiceId, selectedChoice.isCorrect ? 1 : 0)
		.all<McqAttemptRow>();

	const row = results[0];

	if (!row) {
		throw new Error("Failed to create attempt");
	}

	return mapAttemptRow(row);
}
