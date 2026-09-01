import { GET } from "@/app/api/auth/me/route";
import * as sessionCookie from "@/lib/auth/session-cookie";
import * as userService from "@/lib/services/user-service";

vi.mock("@/lib/auth/session-cookie", () => ({
	getSessionPayloadFromCookies: vi.fn(),
}));

vi.mock("@/lib/services/user-service", () => ({
	getUserById: vi.fn(),
}));

const sampleUser = {
	id: "user-123",
	firstName: "Jane",
	lastName: "Smith",
	email: "jane@school.edu",
	createdAt: "2026-01-01 00:00:00",
	updatedAt: "2026-01-01 00:00:00",
};

describe("GET /api/auth/me", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(sessionCookie.getSessionPayloadFromCookies).mockResolvedValue({
			userId: "user-123",
			email: "jane@school.edu",
			exp: Math.floor(Date.now() / 1000) + 3600,
		});
		vi.mocked(userService.getUserById).mockResolvedValue(sampleUser);
	});

	it("returns 200 and user when session valid", async () => {
		const response = await GET();

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ user: sampleUser });
	});

	it("returns 401 when no session cookie", async () => {
		vi.mocked(sessionCookie.getSessionPayloadFromCookies).mockResolvedValue(null);

		const response = await GET();

		expect(response.status).toBe(401);
	});

	it("returns 401 when session token invalid", async () => {
		vi.mocked(sessionCookie.getSessionPayloadFromCookies).mockResolvedValue(null);

		const response = await GET();

		expect(response.status).toBe(401);
		expect(await response.json()).toHaveProperty("error");
	});
});
