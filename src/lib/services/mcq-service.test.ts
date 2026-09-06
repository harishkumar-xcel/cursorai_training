import { getCloudflareContext } from "@opennextjs/cloudflare";

import {
	createAttempt,
	createMcq,
	deleteMcq,
	getMcqById,
	listMcqsByUserId,
	updateMcq,
} from "@/lib/services/mcq-service";

vi.mock("@opennextjs/cloudflare", () => ({
	getCloudflareContext: vi.fn(),
}));

type MockDbChain = {
	prepare: ReturnType<typeof vi.fn>;
	bind: ReturnType<typeof vi.fn>;
	all: ReturnType<typeof vi.fn>;
	run: ReturnType<typeof vi.fn>;
};

function createMockDb(): MockDbChain {
	const all = vi.fn();
	const run = vi.fn();
	const bind = vi.fn(() => ({ all, run }));
	const prepare = vi.fn(() => ({ bind }));

	return { prepare, bind, all, run };
}

const sampleMcqRow = {
	id: "mcq-1",
	name: "Photosynthesis",
	question: "What gas do plants absorb?",
	created_by_user_id: "user-1",
	created_at: "2026-01-01 00:00:00",
	updated_at: "2026-01-01 00:00:00",
};

const sampleChoiceRow = {
	id: "choice-1",
	mcq_id: "mcq-1",
	choice_text: "Carbon dioxide",
	is_correct: 1,
	sort_order: 0,
	created_at: "2026-01-01 00:00:00",
	updated_at: "2026-01-01 00:00:00",
};

const sampleChoiceRow2 = {
	...sampleChoiceRow,
	id: "choice-2",
	choice_text: "Oxygen",
	is_correct: 0,
	sort_order: 1,
};

describe("mcq-service", () => {
	let mockDb: MockDbChain;

	beforeEach(() => {
		mockDb = createMockDb();
		vi.mocked(getCloudflareContext).mockResolvedValue({
			env: { DB: mockDb as unknown as D1Database },
		} as Awaited<ReturnType<typeof getCloudflareContext>>);
	});

	it("listMcqsByUserId returns summaries for the user", async () => {
		mockDb.all.mockResolvedValueOnce({ results: [sampleMcqRow] });

		const mcqs = await listMcqsByUserId("user-1");

		expect(mcqs).toEqual([
			{
				id: "mcq-1",
				name: "Photosynthesis",
				question: "What gas do plants absorb?",
				createdAt: "2026-01-01 00:00:00",
				updatedAt: "2026-01-01 00:00:00",
			},
		]);
	});

	it("getMcqById returns null when not found", async () => {
		mockDb.all.mockResolvedValueOnce({ results: [] });

		expect(await getMcqById("missing", "user-1")).toBeNull();
	});

	it("getMcqById returns choices without answers by default", async () => {
		mockDb.all
			.mockResolvedValueOnce({ results: [sampleMcqRow] })
			.mockResolvedValueOnce({ results: [sampleChoiceRow, sampleChoiceRow2] });

		const mcq = await getMcqById("mcq-1", "user-1");

		expect(mcq?.choices).toEqual([
			{
				id: "choice-1",
				choiceText: "Carbon dioxide",
				isCorrect: false,
				sortOrder: 0,
			},
			{
				id: "choice-2",
				choiceText: "Oxygen",
				isCorrect: false,
				sortOrder: 1,
			},
		]);
	});

	it("getMcqById includes answers when requested", async () => {
		mockDb.all
			.mockResolvedValueOnce({ results: [sampleMcqRow] })
			.mockResolvedValueOnce({ results: [sampleChoiceRow, sampleChoiceRow2] });

		const mcq = await getMcqById("mcq-1", "user-1", { includeAnswers: true });

		expect(mcq?.choices[0]?.isCorrect).toBe(true);
		expect(mcq?.choices[1]?.isCorrect).toBe(false);
	});

	it("createMcq inserts question and choices", async () => {
		mockDb.all
			.mockResolvedValueOnce({ results: [sampleMcqRow] })
			.mockResolvedValueOnce({ results: [sampleChoiceRow] })
			.mockResolvedValueOnce({ results: [sampleChoiceRow2] });

		const mcq = await createMcq("user-1", {
			name: "Photosynthesis",
			question: "What gas do plants absorb?",
			choices: [
				{ choiceText: "Carbon dioxide", isCorrect: true },
				{ choiceText: "Oxygen", isCorrect: false },
			],
		});

		expect(mcq.id).toBe("mcq-1");
		expect(mcq.choices).toHaveLength(2);
		expect(mockDb.prepare).toHaveBeenCalled();
	});

	it("updateMcq replaces choices after updating the question", async () => {
		mockDb.all
			.mockResolvedValueOnce({ results: [sampleMcqRow] })
			.mockResolvedValueOnce({ results: [sampleChoiceRow, sampleChoiceRow2] })
			.mockResolvedValueOnce({ results: [sampleMcqRow] })
			.mockResolvedValueOnce({ results: [sampleChoiceRow] })
			.mockResolvedValueOnce({ results: [sampleChoiceRow2] });

		mockDb.run.mockResolvedValueOnce({ success: true });

		const mcq = await updateMcq("mcq-1", "user-1", {
			name: "Photosynthesis",
			question: "What gas do plants absorb?",
			choices: [
				{ choiceText: "Carbon dioxide", isCorrect: true },
				{ choiceText: "Oxygen", isCorrect: false },
			],
		});

		expect(mcq.choices).toHaveLength(2);
		expect(mockDb.run).toHaveBeenCalled();
	});

	it("updateMcq throws when question is not found", async () => {
		mockDb.all.mockResolvedValueOnce({ results: [] });

		await expect(
			updateMcq("missing", "user-1", {
				name: "Test",
				question: "Question?",
				choices: [
					{ choiceText: "A", isCorrect: true },
					{ choiceText: "B", isCorrect: false },
				],
			}),
		).rejects.toThrow("MCQ not found");
	});

	it("deleteMcq removes owned question", async () => {
		mockDb.run.mockResolvedValueOnce({ success: true, meta: { changes: 1 } });

		await deleteMcq("mcq-1", "user-1");

		expect(mockDb.prepare).toHaveBeenCalled();
		expect(mockDb.bind).toHaveBeenCalledWith("mcq-1", "user-1");
	});

	it("deleteMcq throws when question is not found", async () => {
		mockDb.run.mockResolvedValueOnce({ success: true, meta: { changes: 0 } });

		await expect(deleteMcq("missing", "user-1")).rejects.toThrow("MCQ not found");
	});

	it("createAttempt records whether the selected choice was correct", async () => {
		mockDb.all
			.mockResolvedValueOnce({ results: [sampleMcqRow] })
			.mockResolvedValueOnce({ results: [sampleChoiceRow, sampleChoiceRow2] })
			.mockResolvedValueOnce({
				results: [
					{
						id: "attempt-1",
						mcq_id: "mcq-1",
						user_id: "user-1",
						choice_id: "choice-1",
						is_correct: 1,
						created_at: "2026-01-01 00:00:00",
					},
				],
			});

		const attempt = await createAttempt("mcq-1", "user-1", { choiceId: "choice-1" });

		expect(attempt).toEqual({
			id: "attempt-1",
			mcqId: "mcq-1",
			userId: "user-1",
			choiceId: "choice-1",
			isCorrect: true,
			createdAt: "2026-01-01 00:00:00",
		});
	});

	it("createAttempt throws when choice does not belong to question", async () => {
		mockDb.all
			.mockResolvedValueOnce({ results: [sampleMcqRow] })
			.mockResolvedValueOnce({ results: [sampleChoiceRow, sampleChoiceRow2] });

		await expect(
			createAttempt("mcq-1", "user-1", { choiceId: "missing-choice" }),
		).rejects.toThrow("Choice not found");
	});
});
