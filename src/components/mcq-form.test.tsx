import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { McqForm } from "@/components/mcq-form";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push, refresh }),
}));

describe("McqForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders create form with two default choices", () => {
		render(<McqForm />);

		expect(screen.getByText("Create question")).toBeInTheDocument();
		expect(screen.getAllByPlaceholderText(/Choice \d/)).toHaveLength(2);
	});

	it("submits a new question", async () => {
		const user = userEvent.setup();
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ mcq: { id: "mcq-1" } }),
		});
		vi.stubGlobal("fetch", fetchMock);

		render(<McqForm />);

		await user.type(screen.getByLabelText("Name"), "Photosynthesis");
		await user.type(screen.getByLabelText("Question"), "What gas do plants absorb?");
		await user.type(screen.getAllByPlaceholderText(/Choice \d/)[0], "Carbon dioxide");
		await user.type(screen.getAllByPlaceholderText(/Choice \d/)[1], "Oxygen");
		await user.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				"/api/mcqs",
				expect.objectContaining({ method: "POST" }),
			);
		});

		expect(push).toHaveBeenCalledWith("/mcq");
	});

	it("loads an existing question for editing", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				mcq: {
					name: "Photosynthesis",
					question: "What gas do plants absorb?",
					choices: [
						{ choiceText: "Carbon dioxide", isCorrect: true },
						{ choiceText: "Oxygen", isCorrect: false },
					],
				},
			}),
		});
		vi.stubGlobal("fetch", fetchMock);

		render(<McqForm mcqId="mcq-1" />);

		await waitFor(() => {
			expect(screen.getByDisplayValue("Photosynthesis")).toBeInTheDocument();
		});

		expect(fetchMock).toHaveBeenCalledWith("/api/mcqs/mcq-1?includeAnswers=true", {
			credentials: "include",
		});
		expect(screen.getByText("Edit question")).toBeInTheDocument();
	});
});
