import { getCloudflareContext } from "@opennextjs/cloudflare";

import {
	createUser,
	deleteUser,
	getUserByEmail,
	getUserById,
	updateUser,
} from "@/lib/services/user-service";

vi.mock("@opennextjs/cloudflare", () => ({
	getCloudflareContext: vi.fn(),
}));

type MockDbChain = {
	prepare: ReturnType<typeof vi.fn>;
	bind: ReturnType<typeof vi.fn>;
	all: ReturnType<typeof vi.fn>;
	run: ReturnType<typeof vi.fn>;
};

function createMockDb(): MockDbChain {
	const all = vi.fn();
	const run = vi.fn();
	const bind = vi.fn(() => ({ all, run }));
	const prepare = vi.fn(() => ({ bind }));

	return { prepare, bind, all, run };
}

const sampleRow = {
	id: "user-abc",
	first_name: "Jane",
	last_name: "Smith",
	email: "jane@school.edu",
	password_hash: "$2a$10$hashedvalue",
	created_at: "2026-01-01 00:00:00",
	updated_at: "2026-01-01 00:00:00",
};

describe("user-service", () => {
	let mockDb: MockDbChain;

	beforeEach(() => {
		mockDb = createMockDb();
		vi.mocked(getCloudflareContext).mockResolvedValue({
			env: { DB: mockDb as unknown as D1Database },
		} as Awaited<ReturnType<typeof getCloudflareContext>>);
	});

	it("createUser inserts row and returns user without password_hash", async () => {
		mockDb.all.mockResolvedValueOnce({
			results: [
				{
					id: "user-abc",
					first_name: "Jane",
					last_name: "Smith",
					email: "jane@school.edu",
					created_at: "2026-01-01 00:00:00",
					updated_at: "2026-01-01 00:00:00",
				},
			],
		});

		const user = await createUser({
			firstName: "Jane",
			lastName: "Smith",
			email: "jane@school.edu",
			password: "SecurePass123",
		});

		expect(user).toEqual({
			id: "user-abc",
			firstName: "Jane",
			lastName: "Smith",
			email: "jane@school.edu",
			createdAt: "2026-01-01 00:00:00",
			updatedAt: "2026-01-01 00:00:00",
		});
		expect(user).not.toHaveProperty("passwordHash");
		expect(user).not.toHaveProperty("password_hash");
		expect(mockDb.prepare).toHaveBeenCalled();
	});

	it("createUser normalizes email to lowercase", async () => {
		mockDb.all.mockResolvedValueOnce({
			results: [
				{
					id: "user-abc",
					first_name: "Jane",
					last_name: "Smith",
					email: "jane@school.edu",
					created_at: "2026-01-01 00:00:00",
					updated_at: "2026-01-01 00:00:00",
				},
			],
		});

		await createUser({
			firstName: "Jane",
			lastName: "Smith",
			email: "Jane@School.edu",
			password: "SecurePass123",
		});

		expect(mockDb.bind).toHaveBeenCalledWith("Jane", "Smith", "jane@school.edu", expect.any(String));
	});

	it("createUser stores hashed password, not plaintext", async () => {
		mockDb.all.mockResolvedValueOnce({
			results: [
				{
					id: "user-abc",
					first_name: "Jane",
					last_name: "Smith",
					email: "jane@school.edu",
					created_at: "2026-01-01 00:00:00",
					updated_at: "2026-01-01 00:00:00",
				},
			],
		});

		const plainPassword = "SecurePass123";

		await createUser({
			firstName: "Jane",
			lastName: "Smith",
			email: "jane@school.edu",
			password: plainPassword,
		});

		const passwordHashArg = mockDb.bind.mock.calls[0]?.[3] as string;

		expect(passwordHashArg).not.toBe(plainPassword);
		expect(passwordHashArg).toMatch(/^\$2[aby]\$/);
	});

	it("getUserById returns user when found", async () => {
		mockDb.all.mockResolvedValueOnce({ results: [sampleRow] });

		const user = await getUserById("user-abc");

		expect(user).toEqual({
			id: "user-abc",
			firstName: "Jane",
			lastName: "Smith",
			email: "jane@school.edu",
			createdAt: "2026-01-01 00:00:00",
			updatedAt: "2026-01-01 00:00:00",
		});
	});

	it("getUserById returns null when not found", async () => {
		mockDb.all.mockResolvedValueOnce({ results: [] });

		expect(await getUserById("missing-id")).toBeNull();
	});

	it("getUserByEmail returns user with hash for login", async () => {
		mockDb.all.mockResolvedValueOnce({ results: [sampleRow] });

		const user = await getUserByEmail("Jane@School.edu");

		expect(user).toEqual({
			id: "user-abc",
			firstName: "Jane",
			lastName: "Smith",
			email: "jane@school.edu",
			passwordHash: "$2a$10$hashedvalue",
			createdAt: "2026-01-01 00:00:00",
			updatedAt: "2026-01-01 00:00:00",
		});
		expect(mockDb.bind).toHaveBeenCalledWith("jane@school.edu");
	});

	it("updateUser updates name fields", async () => {
		mockDb.all.mockResolvedValueOnce({
			results: [
				{
					id: "user-abc",
					first_name: "Janet",
					last_name: "Smith",
					email: "jane@school.edu",
					created_at: "2026-01-01 00:00:00",
					updated_at: "2026-01-02 00:00:00",
				},
			],
		});

		const user = await updateUser("user-abc", {
			firstName: "Janet",
		});

		expect(user.firstName).toBe("Janet");
		expect(mockDb.prepare).toHaveBeenCalled();
	});

	it("updateUser re-hashes password when password changes", async () => {
		mockDb.all.mockResolvedValueOnce({
			results: [
				{
					id: "user-abc",
					first_name: "Jane",
					last_name: "Smith",
					email: "jane@school.edu",
					created_at: "2026-01-01 00:00:00",
					updated_at: "2026-01-02 00:00:00",
				},
			],
		});

		await updateUser("user-abc", {
			password: "NewSecurePass456",
		});

		const passwordHashArg = mockDb.bind.mock.calls[0]?.[0] as string;

		expect(passwordHashArg).not.toBe("NewSecurePass456");
		expect(passwordHashArg).toMatch(/^\$2[aby]\$/);
	});

	it("deleteUser executes delete statement", async () => {
		mockDb.run.mockResolvedValueOnce({ success: true });

		await deleteUser("user-abc");

		expect(mockDb.prepare).toHaveBeenCalled();
		expect(mockDb.bind).toHaveBeenCalledWith("user-abc");
		expect(mockDb.run).toHaveBeenCalled();
	});
});
