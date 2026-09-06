import { NextRequest } from "next/server";

import { DELETE, GET, PUT } from "@/app/api/mcqs/[id]/route";
import * as sessionCookie from "@/lib/auth/session-cookie";
import * as mcqService from "@/lib/services/mcq-service";

vi.mock("@/lib/services/mcq-service", () => ({
	getMcqById: vi.fn(),
	updateMcq: vi.fn(),
	deleteMcq: vi.fn(),
}));

vi.mock("@/lib/auth/session-cookie", () => ({
	getSessionPayloadFromCookies: vi.fn(),
}));

const sampleMcq = {
	id: "mcq-1",
	name: "Photosynthesis",
	question: "What gas do plants absorb?",
	createdByUserId: "user-1",
	createdAt: "2026-01-01 00:00:00",
	updatedAt: "2026-01-01 00:00:00",
	choices: [
		{
			id: "choice-1",
			choiceText: "Carbon dioxide",
			isCorrect: true,
			sortOrder: 0,
		},
		{
			id: "choice-2",
			choiceText: "Oxygen",
			isCorrect: false,
			sortOrder: 1,
		},
	],
};

function createContext(id = "mcq-1") {
	return { params: Promise.resolve({ id }) };
}

describe("/api/mcqs/[id]", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(sessionCookie.getSessionPayloadFromCookies).mockResolvedValue({
			userId: "user-1",
			email: "jane@school.edu",
		});
		vi.mocked(mcqService.getMcqById).mockResolvedValue(sampleMcq);
		vi.mocked(mcqService.updateMcq).mockResolvedValue(sampleMcq);
		vi.mocked(mcqService.deleteMcq).mockResolvedValue(undefined);
	});

	describe("GET", () => {
		it("returns 401 when not authenticated", async () => {
			vi.mocked(sessionCookie.getSessionPayloadFromCookies).mockResolvedValue(null);

			const response = await GET(
				new NextRequest("http://localhost/api/mcqs/mcq-1"),
				createContext(),
			);

			expect(response.status).toBe(401);
		});

		it("returns 404 when mcq is not found", async () => {
			vi.mocked(mcqService.getMcqById).mockResolvedValue(null);

			const response = await GET(
				new NextRequest("http://localhost/api/mcqs/missing"),
				createContext("missing"),
			);

			expect(response.status).toBe(404);
		});

		it("returns mcq without answers by default", async () => {
			const response = await GET(
				new NextRequest("http://localhost/api/mcqs/mcq-1"),
				createContext(),
			);

			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.mcq.choices[0]).not.toHaveProperty("isCorrect");
		});

		it("returns mcq with answers when includeAnswers=true", async () => {
			const response = await GET(
				new NextRequest("http://localhost/api/mcqs/mcq-1?includeAnswers=true"),
				createContext(),
			);

			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.mcq.choices[0]).toEqual({
				id: "choice-1",
				choiceText: "Carbon dioxide",
				sortOrder: 0,
				isCorrect: true,
			});
			expect(mcqService.getMcqById).toHaveBeenCalledWith("mcq-1", "user-1", {
				includeAnswers: true,
			});
		});
	});

	describe("PUT", () => {
		it("returns 401 when not authenticated", async () => {
			vi.mocked(sessionCookie.getSessionPayloadFromCookies).mockResolvedValue(null);

			const response = await PUT(
				new NextRequest("http://localhost/api/mcqs/mcq-1", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						name: "Updated",
						question: "Updated question?",
						choices: [
							{ choiceText: "A", isCorrect: true },
							{ choiceText: "B", isCorrect: false },
						],
					}),
				}),
				createContext(),
			);

			expect(response.status).toBe(401);
		});

		it("updates mcq for authenticated user", async () => {
			const response = await PUT(
				new NextRequest("http://localhost/api/mcqs/mcq-1", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						name: "Updated",
						question: "Updated question?",
						choices: [
							{ choiceText: "A", isCorrect: true },
							{ choiceText: "B", isCorrect: false },
						],
					}),
				}),
				createContext(),
			);

			expect(response.status).toBe(200);
			expect(mcqService.updateMcq).toHaveBeenCalledWith("mcq-1", "user-1", {
				name: "Updated",
				question: "Updated question?",
				choices: [
					{ choiceText: "A", isCorrect: true },
					{ choiceText: "B", isCorrect: false },
				],
			});
		});

		it("returns 400 for invalid body", async () => {
			const response = await PUT(
				new NextRequest("http://localhost/api/mcqs/mcq-1", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						name: "",
						question: "Updated question?",
						choices: [
							{ choiceText: "A", isCorrect: true },
							{ choiceText: "B", isCorrect: false },
						],
					}),
				}),
				createContext(),
			);

			expect(response.status).toBe(400);
		});

		it("returns 404 when update fails", async () => {
			vi.mocked(mcqService.updateMcq).mockRejectedValue(new Error("MCQ not found"));

			const response = await PUT(
				new NextRequest("http://localhost/api/mcqs/missing", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						name: "Updated",
						question: "Updated question?",
						choices: [
							{ choiceText: "A", isCorrect: true },
							{ choiceText: "B", isCorrect: false },
						],
					}),
				}),
				createContext("missing"),
			);

			expect(response.status).toBe(404);
		});
	});

	describe("DELETE", () => {
		it("returns 401 when not authenticated", async () => {
			vi.mocked(sessionCookie.getSessionPayloadFromCookies).mockResolvedValue(null);

			const response = await DELETE(
				new NextRequest("http://localhost/api/mcqs/mcq-1", { method: "DELETE" }),
				createContext(),
			);

			expect(response.status).toBe(401);
		});

		it("deletes mcq for authenticated user", async () => {
			const response = await DELETE(
				new NextRequest("http://localhost/api/mcqs/mcq-1", { method: "DELETE" }),
				createContext(),
			);

			expect(response.status).toBe(200);
			expect(await response.json()).toEqual({ success: true });
		});

		it("returns 404 when delete fails", async () => {
			vi.mocked(mcqService.deleteMcq).mockRejectedValue(new Error("MCQ not found"));

			const response = await DELETE(
				new NextRequest("http://localhost/api/mcqs/missing", { method: "DELETE" }),
				createContext("missing"),
			);

			expect(response.status).toBe(404);
		});
	});
});
