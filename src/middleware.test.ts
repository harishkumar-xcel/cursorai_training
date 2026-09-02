import { resolveAuthRedirect } from "@/lib/auth/route-guards";

describe("middleware auth routing", () => {
	it("redirects unauthenticated request to /mcq to /login", () => {
		expect(resolveAuthRedirect("/mcq", false)).toBe("/login");
	});

	it("allows authenticated request to /mcq", () => {
		expect(resolveAuthRedirect("/mcq", true)).toBeNull();
	});

	it("redirects authenticated request to /login to /mcq", () => {
		expect(resolveAuthRedirect("/login", true)).toBe("/mcq");
	});

	it("redirects authenticated request to /register to /mcq", () => {
		expect(resolveAuthRedirect("/register", true)).toBe("/mcq");
	});

	it("allows public routes when unauthenticated", () => {
		expect(resolveAuthRedirect("/", false)).toBeNull();
		expect(resolveAuthRedirect("/login", false)).toBeNull();
		expect(resolveAuthRedirect("/register", false)).toBeNull();
	});
});
