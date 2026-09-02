import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoginForm } from "@/components/login-form";

const push = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push }),
}));

describe("LoginForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal("fetch", vi.fn());
	});

	it("renders email and password fields", () => {
		render(<LoginForm />);

		expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
	});

	it("shows generic error on 401 response", async () => {
		const user = userEvent.setup();

		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			status: 401,
			json: async () => ({ error: "Invalid email or password" }),
		} as Response);

		render(<LoginForm />);

		await user.type(screen.getByLabelText(/email/i), "jane@school.edu");
		await user.type(screen.getByLabelText(/^password$/i), "WrongPassword1");
		await user.click(screen.getByRole("button", { name: /login/i }));

		expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
	});

	it("calls login API on valid submit", async () => {
		const user = userEvent.setup();

		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: async () => ({ user: { id: "user-123" } }),
		} as Response);

		render(<LoginForm />);

		await user.type(screen.getByLabelText(/email/i), "jane@school.edu");
		await user.type(screen.getByLabelText(/^password$/i), "SecurePass123");
		await user.click(screen.getByRole("button", { name: /login/i }));

		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: "jane@school.edu",
					password: "SecurePass123",
				}),
			});
		});

		expect(push).toHaveBeenCalledWith("/mcq");
	});
});
