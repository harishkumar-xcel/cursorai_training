import { NextRequest } from "next/server";

import { POST } from "@/app/api/mcqs/[id]/attempts/route";
import * as sessionCookie from "@/lib/auth/session-cookie";
import * as mcqService from "@/lib/services/mcq-service";

vi.mock("@/lib/services/mcq-service", () => ({
	createAttempt: vi.fn(),
}));

vi.mock("@/lib/auth/session-cookie", () => ({
	getSessionPayloadFromCookies: vi.fn(),
}));

const sampleAttempt = {
	id: "attempt-1",
	mcqId: "mcq-1",
	userId: "user-1",
	choiceId: "choice-1",
	isCorrect: true,
	createdAt: "2026-01-01 00:00:00",
};

function createContext(id = "mcq-1") {
	return { params: Promise.resolve({ id }) };
}

function createAttemptRequest(body: unknown, id = "mcq-1") {
	return new NextRequest(`http://localhost/api/mcqs/${id}/attempts`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("POST /api/mcqs/[id]/attempts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(sessionCookie.getSessionPayloadFromCookies).mockResolvedValue({
			userId: "user-1",
			email: "jane@school.edu",
		});
		vi.mocked(mcqService.createAttempt).mockResolvedValue(sampleAttempt);
	});

	it("returns 201 and the attempt payload", async () => {
		const response = await POST(createAttemptRequest({ choiceId: "choice-1" }), createContext());

		expect(response.status).toBe(201);
		expect(await response.json()).toEqual({
			attempt: {
				id: "attempt-1",
				mcqId: "mcq-1",
				choiceId: "choice-1",
				isCorrect: true,
				createdAt: "2026-01-01 00:00:00",
			},
		});
		expect(mcqService.createAttempt).toHaveBeenCalledWith("mcq-1", "user-1", {
			choiceId: "choice-1",
		});
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(sessionCookie.getSessionPayloadFromCookies).mockResolvedValue(null);

		const response = await POST(createAttemptRequest({ choiceId: "choice-1" }), createContext());

		expect(response.status).toBe(401);
	});

	it("returns 400 for invalid body", async () => {
		const response = await POST(createAttemptRequest({ choiceId: "" }), createContext());

		expect(response.status).toBe(400);
		expect(await response.json()).toHaveProperty("error");
	});

	it("returns 404 when the question is not found", async () => {
		vi.mocked(mcqService.createAttempt).mockRejectedValue(new Error("MCQ not found"));

		const response = await POST(createAttemptRequest({ choiceId: "choice-1" }), createContext());

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Question not found" });
	});

	it("returns 400 when the choice does not belong to the question", async () => {
		vi.mocked(mcqService.createAttempt).mockRejectedValue(new Error("Choice not found"));

		const response = await POST(createAttemptRequest({ choiceId: "missing-choice" }), createContext());

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "Invalid choice for this question" });
	});
});
