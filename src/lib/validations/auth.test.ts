import { loginSchema, registerSchema } from "@/lib/validations/auth";

describe("auth validation schemas", () => {
	describe("registerSchema", () => {
		const validInput = {
			firstName: "Jane",
			lastName: "Smith",
			email: "jane@school.edu",
			password: "SecurePass123",
		};

		it("rejects missing firstName", () => {
			expect(
				registerSchema.safeParse({
					lastName: validInput.lastName,
					email: validInput.email,
					password: validInput.password,
				}).success,
			).toBe(false);
		});

		it("rejects invalid email", () => {
			expect(
				registerSchema.safeParse({
					...validInput,
					email: "not-an-email",
				}).success,
			).toBe(false);
		});

		it("rejects password shorter than 8 characters", () => {
			expect(
				registerSchema.safeParse({
					...validInput,
					password: "short",
				}).success,
			).toBe(false);
		});
	});

	describe("loginSchema", () => {
		it("rejects missing email or password", () => {
			expect(loginSchema.safeParse({ email: "jane@school.edu" }).success).toBe(false);
			expect(loginSchema.safeParse({ password: "SecurePass123" }).success).toBe(false);
		});
	});
});
