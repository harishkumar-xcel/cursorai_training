import { POST } from "@/app/api/auth/logout/route";
import * as sessionCookie from "@/lib/auth/session-cookie";

vi.mock("@/lib/auth/session-cookie", () => ({
	clearSessionCookie: vi.fn(),
}));

describe("POST /api/auth/logout", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(sessionCookie.clearSessionCookie).mockResolvedValue(undefined);
	});

	it("returns 200 and clears session cookie", async () => {
		const response = await POST();

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ success: true });
		expect(sessionCookie.clearSessionCookie).toHaveBeenCalled();
	});

	it("clears cookie with maxAge 0", async () => {
		await POST();

		expect(sessionCookie.clearSessionCookie).toHaveBeenCalled();
	});
});
