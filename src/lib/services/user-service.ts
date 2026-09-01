import { getCloudflareContext } from "@opennextjs/cloudflare";

import { hashPassword } from "@/lib/auth/password";
import { USERS_TABLE } from "@/lib/db/users-schema";
import type { CreateUserInput, UpdateUserInput, User, UserWithHash } from "@/lib/types/user";

type UserRow = {
	id: string;
	first_name: string;
	last_name: string;
	email: string;
	password_hash?: string;
	created_at: string;
	updated_at: string;
};

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

function mapUserRow(row: UserRow): User {
	return {
		id: row.id,
		firstName: row.first_name,
		lastName: row.last_name,
		email: row.email,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function mapUserRowWithHash(row: UserRow & { password_hash: string }): UserWithHash {
	return {
		...mapUserRow(row),
		passwordHash: row.password_hash,
	};
}

async function getDb(): Promise<D1Database> {
	const { env } = await getCloudflareContext();
	return env.DB;
}

export async function createUser(input: CreateUserInput): Promise<User> {
	const db = await getDb();
	const email = normalizeEmail(input.email);
	const passwordHash = await hashPassword(input.password);

	const { results } = await db
		.prepare(
			`INSERT INTO ${USERS_TABLE} (first_name, last_name, email, password_hash)
       VALUES (?1, ?2, ?3, ?4)
       RETURNING id, first_name, last_name, email, created_at, updated_at`,
		)
		.bind(input.firstName, input.lastName, email, passwordHash)
		.all<UserRow>();

	const row = results[0];

	if (!row) {
		throw new Error("Failed to create user");
	}

	return mapUserRow(row);
}

export async function getUserById(id: string): Promise<User | null> {
	const db = await getDb();

	const { results } = await db
		.prepare(
			`SELECT id, first_name, last_name, email, created_at, updated_at
       FROM ${USERS_TABLE}
       WHERE id = ?1`,
		)
		.bind(id)
		.all<UserRow>();

	const row = results[0];

	return row ? mapUserRow(row) : null;
}

export async function getUserByEmail(email: string): Promise<UserWithHash | null> {
	const db = await getDb();
	const normalizedEmail = normalizeEmail(email);

	const { results } = await db
		.prepare(
			`SELECT id, first_name, last_name, email, password_hash, created_at, updated_at
       FROM ${USERS_TABLE}
       WHERE email = ?1 COLLATE NOCASE`,
		)
		.bind(normalizedEmail)
		.all<UserRow & { password_hash: string }>();

	const row = results[0];

	return row ? mapUserRowWithHash(row) : null;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
	const db = await getDb();

	if (input.password) {
		const passwordHash = await hashPassword(input.password);

		const { results } = await db
			.prepare(
				`UPDATE ${USERS_TABLE}
         SET password_hash = ?1, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?2
         RETURNING id, first_name, last_name, email, created_at, updated_at`,
			)
			.bind(passwordHash, id)
			.all<UserRow>();

		const row = results[0];

		if (!row) {
			throw new Error("User not found");
		}

		if (input.firstName !== undefined || input.lastName !== undefined) {
			return updateUser(id, {
				firstName: input.firstName,
				lastName: input.lastName,
			});
		}

		return mapUserRow(row);
	}

	const firstName = input.firstName;
	const lastName = input.lastName;

	if (firstName === undefined && lastName === undefined) {
		const existing = await getUserById(id);

		if (!existing) {
			throw new Error("User not found");
		}

		return existing;
	}

	const { results } = await db
		.prepare(
			`UPDATE ${USERS_TABLE}
       SET first_name = COALESCE(?1, first_name),
           last_name = COALESCE(?2, last_name),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?3
       RETURNING id, first_name, last_name, email, created_at, updated_at`,
		)
		.bind(firstName ?? null, lastName ?? null, id)
		.all<UserRow>();

	const row = results[0];

	if (!row) {
		throw new Error("User not found");
	}

	return mapUserRow(row);
}

export async function deleteUser(id: string): Promise<void> {
	const db = await getDb();

	await db.prepare(`DELETE FROM ${USERS_TABLE} WHERE id = ?1`).bind(id).run();
}
