import {
	createSessionToken,
	getSessionCookieOptions,
	parseSessionToken,
} from "@/lib/auth/session";

const TEST_SECRET = "test-session-secret-for-unit-tests";

describe("session", () => {
	beforeEach(() => {
		process.env.SESSION_SECRET = TEST_SECRET;
	});

	it("createSessionToken returns a signed non-empty string", async () => {
		const token = await createSessionToken({
			userId: "user-123",
			email: "teacher@school.edu",
		});

		expect(token).toBeTruthy();
		expect(typeof token).toBe("string");
		expect(token.split(".")).toHaveLength(2);
	});

	it("parseSessionToken returns payload for valid token", async () => {
		const token = await createSessionToken({
			userId: "user-123",
			email: "teacher@school.edu",
		});

		const payload = await parseSessionToken(token);

		expect(payload).toEqual({
			userId: "user-123",
			email: "teacher@school.edu",
			exp: expect.any(Number),
		});
	});

	it("parseSessionToken returns null for tampered token", async () => {
		const token = await createSessionToken({
			userId: "user-123",
			email: "teacher@school.edu",
		});
		const tampered = `${token}x`;

		expect(await parseSessionToken(tampered)).toBeNull();
	});

	it("parseSessionToken returns null for expired token", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2020-01-01T00:00:00Z"));

		const token = await createSessionToken({
			userId: "user-123",
			email: "teacher@school.edu",
		});

		vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));

		expect(await parseSessionToken(token)).toBeNull();

		vi.useRealTimers();
	});

	it("getSessionCookieOptions sets httpOnly, sameSite: lax, path: /", () => {
		const options = getSessionCookieOptions();

		expect(options.httpOnly).toBe(true);
		expect(options.sameSite).toBe("lax");
		expect(options.path).toBe("/");
	});
});
