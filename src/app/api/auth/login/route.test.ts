import { NextRequest } from "next/server";

import { POST } from "@/app/api/auth/login/route";
import * as password from "@/lib/auth/password";
import * as sessionCookie from "@/lib/auth/session-cookie";
import * as userService from "@/lib/services/user-service";

vi.mock("@/lib/services/user-service", () => ({
	getUserByEmail: vi.fn(),
}));

vi.mock("@/lib/auth/password", () => ({
	verifyPassword: vi.fn(),
}));

vi.mock("@/lib/auth/session-cookie", () => ({
	setSessionCookie: vi.fn(),
}));

const sampleUserWithHash = {
	id: "user-123",
	firstName: "Jane",
	lastName: "Smith",
	email: "jane@school.edu",
	passwordHash: "$2a$10$hash",
	createdAt: "2026-01-01 00:00:00",
	updatedAt: "2026-01-01 00:00:00",
};

function createLoginRequest(body: unknown) {
	return new NextRequest("http://localhost/api/auth/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("POST /api/auth/login", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(userService.getUserByEmail).mockResolvedValue(sampleUserWithHash);
		vi.mocked(password.verifyPassword).mockResolvedValue(true);
		vi.mocked(sessionCookie.setSessionCookie).mockResolvedValue(undefined);
	});

	it("returns 200 and user JSON on valid credentials", async () => {
		const response = await POST(
			createLoginRequest({
				email: "jane@school.edu",
				password: "SecurePass123",
			}),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			user: {
				id: "user-123",
				firstName: "Jane",
				lastName: "Smith",
				email: "jane@school.edu",
				createdAt: "2026-01-01 00:00:00",
				updatedAt: "2026-01-01 00:00:00",
			},
		});
	});

	it("sets session cookie on success", async () => {
		await POST(
			createLoginRequest({
				email: "jane@school.edu",
				password: "SecurePass123",
			}),
		);

		expect(sessionCookie.setSessionCookie).toHaveBeenCalledWith("user-123", "jane@school.edu");
	});

	it("returns 401 for unknown email", async () => {
		vi.mocked(userService.getUserByEmail).mockResolvedValue(null);

		const response = await POST(
			createLoginRequest({
				email: "missing@school.edu",
				password: "SecurePass123",
			}),
		);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Invalid email or password" });
	});

	it("returns 401 for wrong password with the same message as unknown email", async () => {
		vi.mocked(password.verifyPassword).mockResolvedValue(false);

		const response = await POST(
			createLoginRequest({
				email: "jane@school.edu",
				password: "WrongPassword1",
			}),
		);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Invalid email or password" });
	});

	it("returns 400 for invalid body", async () => {
		const response = await POST(
			createLoginRequest({
				email: "not-an-email",
				password: "SecurePass123",
			}),
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toHaveProperty("error");
	});
});
