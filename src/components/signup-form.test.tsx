import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SignupForm } from "@/components/signup-form";
import { redirectAfterAuth } from "@/lib/auth/client-redirect";

vi.mock("@/lib/auth/client-redirect", () => ({
	redirectAfterAuth: vi.fn(),
}));

describe("SignupForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal("fetch", vi.fn());
	});

	it("renders all required fields", () => {
		render(<SignupForm />);

		expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
	});

	it("shows validation error when passwords do not match", async () => {
		const user = userEvent.setup();

		render(<SignupForm />);

		await user.type(screen.getByLabelText(/first name/i), "Jane");
		await user.type(screen.getByLabelText(/last name/i), "Smith");
		await user.type(screen.getByLabelText(/^email$/i), "jane@school.edu");
		await user.type(screen.getByLabelText(/^password$/i), "SecurePass123");
		await user.type(screen.getByLabelText(/confirm password/i), "DifferentPass1");
		await user.click(screen.getByRole("button", { name: /create account/i }));

		expect(await screen.findByRole("alert")).toHaveTextContent("Passwords do not match");
		expect(fetch).not.toHaveBeenCalled();
	});

	it("shows server error message on failed submit", async () => {
		const user = userEvent.setup();

		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			status: 409,
			json: async () => ({ error: "An account with this email already exists" }),
		} as Response);

		render(<SignupForm />);

		await user.type(screen.getByLabelText(/first name/i), "Jane");
		await user.type(screen.getByLabelText(/last name/i), "Smith");
		await user.type(screen.getByLabelText(/^email$/i), "jane@school.edu");
		await user.type(screen.getByLabelText(/^password$/i), "SecurePass123");
		await user.type(screen.getByLabelText(/confirm password/i), "SecurePass123");
		await user.click(screen.getByRole("button", { name: /create account/i }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"An account with this email already exists",
		);
	});

	it("calls register API on valid submit", async () => {
		const user = userEvent.setup();

		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			status: 201,
			json: async () => ({ user: { id: "user-123" } }),
		} as Response);

		render(<SignupForm />);

		await user.type(screen.getByLabelText(/first name/i), "Jane");
		await user.type(screen.getByLabelText(/last name/i), "Smith");
		await user.type(screen.getByLabelText(/^email$/i), "jane@school.edu");
		await user.type(screen.getByLabelText(/^password$/i), "SecurePass123");
		await user.type(screen.getByLabelText(/confirm password/i), "SecurePass123");
		await user.click(screen.getByRole("button", { name: /create account/i }));

		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith("/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					firstName: "Jane",
					lastName: "Smith",
					email: "jane@school.edu",
					password: "SecurePass123",
				}),
			});
		});

		expect(redirectAfterAuth).toHaveBeenCalled();
	});
});
