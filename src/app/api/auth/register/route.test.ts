import { NextRequest } from "next/server";

import { POST } from "@/app/api/auth/register/route";
import * as sessionCookie from "@/lib/auth/session-cookie";
import * as userService from "@/lib/services/user-service";

vi.mock("@/lib/services/user-service", () => ({
	createUser: vi.fn(),
	getUserByEmail: vi.fn(),
}));

vi.mock("@/lib/auth/session-cookie", () => ({
	setSessionCookie: vi.fn(),
}));

const sampleUser = {
	id: "user-123",
	firstName: "Jane",
	lastName: "Smith",
	email: "jane@school.edu",
	createdAt: "2026-01-01 00:00:00",
	updatedAt: "2026-01-01 00:00:00",
};

function createRegisterRequest(body: unknown) {
	return new NextRequest("http://localhost/api/auth/register", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("POST /api/auth/register", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(userService.getUserByEmail).mockResolvedValue(null);
		vi.mocked(userService.createUser).mockResolvedValue(sampleUser);
		vi.mocked(sessionCookie.setSessionCookie).mockResolvedValue(undefined);
	});

	it("returns 201 and user JSON on success", async () => {
		const response = await POST(
			createRegisterRequest({
				firstName: "Jane",
				lastName: "Smith",
				email: "jane@school.edu",
				password: "SecurePass123",
			}),
		);

		expect(response.status).toBe(201);
		expect(await response.json()).toEqual({ user: sampleUser });
	});

	it("sets session cookie on success", async () => {
		await POST(
			createRegisterRequest({
				firstName: "Jane",
				lastName: "Smith",
				email: "jane@school.edu",
				password: "SecurePass123",
			}),
		);

		expect(sessionCookie.setSessionCookie).toHaveBeenCalledWith("user-123", "jane@school.edu");
	});

	it("returns 400 for invalid body", async () => {
		const response = await POST(
			createRegisterRequest({
				firstName: "Jane",
				lastName: "Smith",
				email: "not-an-email",
				password: "SecurePass123",
			}),
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toHaveProperty("error");
	});

	it("returns 409 when email already exists", async () => {
		vi.mocked(userService.getUserByEmail).mockResolvedValue({
			...sampleUser,
			passwordHash: "$2a$10$hash",
		});

		const response = await POST(
			createRegisterRequest({
				firstName: "Jane",
				lastName: "Smith",
				email: "jane@school.edu",
				password: "SecurePass123",
			}),
		);

		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({
			error: "An account with this email already exists",
		});
	});

	it("response never includes password or password_hash", async () => {
		const response = await POST(
			createRegisterRequest({
				firstName: "Jane",
				lastName: "Smith",
				email: "jane@school.edu",
				password: "SecurePass123",
			}),
		);

		const body = await response.json();

		expect(body.user).not.toHaveProperty("password");
		expect(body.user).not.toHaveProperty("password_hash");
		expect(body.user).not.toHaveProperty("passwordHash");
	});
});
