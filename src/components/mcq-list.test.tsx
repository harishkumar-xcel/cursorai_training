import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { McqList } from "@/components/mcq-list";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push, refresh }),
}));

const sampleMcqs = [
	{
		id: "mcq-1",
		name: "Photosynthesis",
		question: "What gas do plants absorb?",
		createdAt: "2026-01-01 00:00:00",
		updatedAt: "2026-01-01 00:00:00",
	},
];

describe("McqList", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders questions from the API", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ mcqs: sampleMcqs }),
			}),
		);

		render(<McqList />);

		expect(screen.getByText("Loading questions...")).toBeInTheDocument();

		await waitFor(() => {
			expect(screen.getByText("Photosynthesis")).toBeInTheDocument();
		});

		expect(screen.getByText("What gas do plants absorb?")).toBeInTheDocument();
		expect(fetch).toHaveBeenCalledWith("/api/mcqs", { credentials: "include" });
	});

	it("shows an empty state when there are no questions", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ mcqs: [] }),
			}),
		);

		render(<McqList />);

		await waitFor(() => {
			expect(screen.getByText("No questions to display.")).toBeInTheDocument();
		});
	});

	it("deletes a question after confirmation", async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ mcqs: sampleMcqs }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ success: true }),
			});
		vi.stubGlobal("fetch", fetchMock);

		render(<McqList />);

		await waitFor(() => {
			expect(screen.getByText("Photosynthesis")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Open actions" }));
		await user.click(await screen.findByRole("menuitem", { name: /delete/i }));
		await user.click(screen.getByRole("button", { name: "Delete" }));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith("/api/mcqs/mcq-1", {
				method: "DELETE",
				credentials: "include",
			});
		});

		expect(screen.queryByText("Photosynthesis")).not.toBeInTheDocument();
		expect(refresh).toHaveBeenCalled();
	});
});
