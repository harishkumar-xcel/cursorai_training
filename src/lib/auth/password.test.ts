import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password", () => {
	const plainPassword = "SecurePass123";

	it("hashPassword returns a string different from the plaintext", async () => {
		const hash = await hashPassword(plainPassword);

		expect(hash).not.toBe(plainPassword);
		expect(hash.length).toBeGreaterThan(0);
	});

	it("hashPassword produces different hashes for the same input (salt)", async () => {
		const firstHash = await hashPassword(plainPassword);
		const secondHash = await hashPassword(plainPassword);

		expect(firstHash).not.toBe(secondHash);
	});

	it("verifyPassword returns true for correct plaintext + hash", async () => {
		const hash = await hashPassword(plainPassword);

		expect(await verifyPassword(plainPassword, hash)).toBe(true);
	});

	it("verifyPassword returns false for wrong plaintext", async () => {
		const hash = await hashPassword(plainPassword);

		expect(await verifyPassword("WrongPassword1", hash)).toBe(false);
	});
});
