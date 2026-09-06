import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { McqPreview } from "@/components/mcq-preview";

describe("McqPreview", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the question and choices", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					mcq: {
						name: "Photosynthesis",
						question: "What gas do plants absorb?",
						choices: [
							{ id: "choice-1", choiceText: "Carbon dioxide", sortOrder: 0 },
							{ id: "choice-2", choiceText: "Oxygen", sortOrder: 1 },
						],
					},
				}),
			}),
		);

		render(<McqPreview mcqId="mcq-1" />);

		await waitFor(() => {
			expect(screen.getByText("What gas do plants absorb?")).toBeInTheDocument();
		});

		expect(screen.getByLabelText("Carbon dioxide")).toBeInTheDocument();
		expect(screen.getByLabelText("Oxygen")).toBeInTheDocument();
	});

	it("requires a selected answer before submitting", async () => {
		const user = userEvent.setup();

		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					mcq: {
						name: "Photosynthesis",
						question: "What gas do plants absorb?",
						choices: [
							{ id: "choice-1", choiceText: "Carbon dioxide", sortOrder: 0 },
							{ id: "choice-2", choiceText: "Oxygen", sortOrder: 1 },
						],
					},
				}),
			}),
		);

		render(<McqPreview mcqId="mcq-1" />);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Submit answer" })).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Submit answer" }));

		expect(screen.getByText("Select an answer before submitting")).toBeInTheDocument();
	});

	it("records an attempt and shows feedback", async () => {
		const user = userEvent.setup();
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					mcq: {
						name: "Photosynthesis",
						question: "What gas do plants absorb?",
						choices: [
							{ id: "choice-1", choiceText: "Carbon dioxide", sortOrder: 0 },
							{ id: "choice-2", choiceText: "Oxygen", sortOrder: 1 },
						],
					},
				}),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					attempt: { isCorrect: true },
				}),
			});
		vi.stubGlobal("fetch", fetchMock);

		render(<McqPreview mcqId="mcq-1" />);

		await waitFor(() => {
			expect(screen.getByLabelText("Carbon dioxide")).toBeInTheDocument();
		});

		await user.click(screen.getByLabelText("Carbon dioxide"));
		await user.click(screen.getByRole("button", { name: "Submit answer" }));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				"/api/mcqs/mcq-1/attempts",
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ choiceId: "choice-1" }),
				}),
			);
		});

		expect(screen.getByText("Correct!")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Edit question" })).toHaveAttribute(
			"href",
			"/mcq/mcq-1/edit",
		);
	});
});
