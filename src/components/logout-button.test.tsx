import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LogoutButton } from "@/components/logout-button";

const push = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push }),
}));

describe("LogoutButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal("fetch", vi.fn());
	});

	it("renders a logout button", () => {
		render(<LogoutButton />);

		expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument();
	});

	it("calls logout API on click", async () => {
		const user = userEvent.setup();

		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: async () => ({ success: true }),
		} as Response);

		render(<LogoutButton />);

		await user.click(screen.getByRole("button", { name: /log out/i }));

		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
		});

		expect(push).toHaveBeenCalledWith("/login");
	});
});
