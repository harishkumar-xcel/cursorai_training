import {
	getAuthRedirectPath,
	resolveAuthRedirect,
	shouldRedirectToLogin,
	shouldRedirectToMcq,
} from "@/lib/auth/route-guards";

describe("route guards", () => {
	it("shouldRedirectToMcq returns true when session exists on auth pages", () => {
		expect(shouldRedirectToMcq("/login", true)).toBe(true);
		expect(shouldRedirectToMcq("/register", true)).toBe(true);
		expect(shouldRedirectToMcq("/login", false)).toBe(false);
	});

	it("shouldRedirectToLogin returns true when no session on /mcq routes", () => {
		expect(shouldRedirectToLogin("/mcq", false)).toBe(true);
		expect(shouldRedirectToLogin("/mcq/new", false)).toBe(true);
		expect(shouldRedirectToLogin("/mcq/abc/edit", false)).toBe(true);
		expect(shouldRedirectToLogin("/mcq", true)).toBe(false);
	});

	it("getAuthRedirectPath returns /mcq after successful auth", () => {
		expect(getAuthRedirectPath()).toBe("/mcq");
	});

	describe("resolveAuthRedirect", () => {
		it("redirects unauthenticated /mcq to /login", () => {
			expect(resolveAuthRedirect("/mcq", false)).toBe("/login");
		});

		it("redirects unauthenticated /mcq subroutes to /login", () => {
			expect(resolveAuthRedirect("/mcq/new", false)).toBe("/login");
		});

		it("allows authenticated /mcq", () => {
			expect(resolveAuthRedirect("/mcq", true)).toBeNull();
		});

		it("redirects authenticated /login to /mcq", () => {
			expect(resolveAuthRedirect("/login", true)).toBe("/mcq");
		});

		it("redirects authenticated /register to /mcq", () => {
			expect(resolveAuthRedirect("/register", true)).toBe("/mcq");
		});

		it("allows public routes when unauthenticated", () => {
			expect(resolveAuthRedirect("/", false)).toBeNull();
			expect(resolveAuthRedirect("/login", false)).toBeNull();
			expect(resolveAuthRedirect("/register", false)).toBeNull();
		});
	});
});
