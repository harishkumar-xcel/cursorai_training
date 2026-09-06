import { createMcqSchema, createAttemptSchema, updateMcqSchema } from "@/lib/validations/mcq";

describe("mcq validations", () => {
	const validChoices = [
		{ choiceText: "Carbon dioxide", isCorrect: true },
		{ choiceText: "Oxygen", isCorrect: false },
	];

	describe("createMcqSchema", () => {
		it("accepts a valid MCQ with two choices", () => {
			const result = createMcqSchema.safeParse({
				name: "Photosynthesis",
				question: "What gas do plants absorb?",
				choices: validChoices,
			});

			expect(result.success).toBe(true);
		});

		it("rejects empty name", () => {
			const result = createMcqSchema.safeParse({
				name: "",
				question: "Question?",
				choices: validChoices,
			});

			expect(result.success).toBe(false);
		});

		it("rejects fewer than two choices", () => {
			const result = createMcqSchema.safeParse({
				name: "Test",
				question: "Question?",
				choices: [{ choiceText: "Only one", isCorrect: true }],
			});

			expect(result.success).toBe(false);
		});

		it("rejects more than six choices", () => {
			const result = createMcqSchema.safeParse({
				name: "Test",
				question: "Question?",
				choices: Array.from({ length: 7 }, (_, index) => ({
					choiceText: `Choice ${index}`,
					isCorrect: index === 0,
				})),
			});

			expect(result.success).toBe(false);
		});

		it("rejects when no choice is marked correct", () => {
			const result = createMcqSchema.safeParse({
				name: "Test",
				question: "Question?",
				choices: [
					{ choiceText: "A", isCorrect: false },
					{ choiceText: "B", isCorrect: false },
				],
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.message).toContain("Exactly one choice");
			}
		});

		it("rejects when multiple choices are marked correct", () => {
			const result = createMcqSchema.safeParse({
				name: "Test",
				question: "Question?",
				choices: [
					{ choiceText: "A", isCorrect: true },
					{ choiceText: "B", isCorrect: true },
				],
			});

			expect(result.success).toBe(false);
		});
	});

	describe("updateMcqSchema", () => {
		it("uses the same rules as createMcqSchema", () => {
			const result = updateMcqSchema.safeParse({
				name: "Updated",
				question: "Updated question?",
				choices: validChoices,
			});

			expect(result.success).toBe(true);
		});
	});

	describe("createAttemptSchema", () => {
		it("accepts a choice id", () => {
			const result = createAttemptSchema.safeParse({ choiceId: "choice-abc" });
			expect(result.success).toBe(true);
		});

		it("rejects empty choice id", () => {
			const result = createAttemptSchema.safeParse({ choiceId: "" });
			expect(result.success).toBe(false);
		});
	});
});
