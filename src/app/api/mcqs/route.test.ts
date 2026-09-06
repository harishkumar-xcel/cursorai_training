import { NextRequest } from "next/server";

import { GET, POST } from "@/app/api/mcqs/route";
import * as sessionCookie from "@/lib/auth/session-cookie";
import * as mcqService from "@/lib/services/mcq-service";

vi.mock("@/lib/services/mcq-service", () => ({
	listMcqsByUserId: vi.fn(),
	createMcq: vi.fn(),
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

function createMcqRequest(body: unknown, method: "POST" | "GET" = "POST") {
	return new NextRequest("http://localhost/api/mcqs", {
		method,
		headers: { "Content-Type": "application/json" },
		body: method === "POST" ? JSON.stringify(body) : undefined,
	});
}

describe("/api/mcqs", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(sessionCookie.getSessionPayloadFromCookies).mockResolvedValue({
			userId: "user-1",
			email: "jane@school.edu",
		});
		vi.mocked(mcqService.listMcqsByUserId).mockResolvedValue([sampleMcq]);
		vi.mocked(mcqService.createMcq).mockResolvedValue(sampleMcq);
	});

	describe("GET", () => {
		it("returns 401 when not authenticated", async () => {
			vi.mocked(sessionCookie.getSessionPayloadFromCookies).mockResolvedValue(null);

			const response = await GET();

			expect(response.status).toBe(401);
		});

		it("returns mcqs for the authenticated user", async () => {
			const response = await GET();

			expect(response.status).toBe(200);
			expect(await response.json()).toEqual({
				mcqs: [
					{
						id: "mcq-1",
						name: "Photosynthesis",
						question: "What gas do plants absorb?",
						createdAt: "2026-01-01 00:00:00",
						updatedAt: "2026-01-01 00:00:00",
					},
				],
			});
			expect(mcqService.listMcqsByUserId).toHaveBeenCalledWith("user-1");
		});
	});

	describe("POST", () => {
		it("returns 201 and created mcq", async () => {
			const response = await POST(
				createMcqRequest({
					name: "Photosynthesis",
					question: "What gas do plants absorb?",
					choices: [
						{ choiceText: "Carbon dioxide", isCorrect: true },
						{ choiceText: "Oxygen", isCorrect: false },
					],
				}),
			);

			expect(response.status).toBe(201);
			expect(await response.json()).toEqual({
				mcq: {
					id: "mcq-1",
					name: "Photosynthesis",
					question: "What gas do plants absorb?",
					createdAt: "2026-01-01 00:00:00",
					updatedAt: "2026-01-01 00:00:00",
					choices: [
						{
							id: "choice-1",
							choiceText: "Carbon dioxide",
							sortOrder: 0,
							isCorrect: true,
						},
						{
							id: "choice-2",
							choiceText: "Oxygen",
							sortOrder: 1,
							isCorrect: false,
						},
					],
				},
			});
			expect(mcqService.createMcq).toHaveBeenCalledWith("user-1", {
				name: "Photosynthesis",
				question: "What gas do plants absorb?",
				choices: [
					{ choiceText: "Carbon dioxide", isCorrect: true },
					{ choiceText: "Oxygen", isCorrect: false },
				],
			});
		});

		it("returns 400 for invalid JSON body", async () => {
			const response = await POST(
				new NextRequest("http://localhost/api/mcqs", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: "{",
				}),
			);

			expect(response.status).toBe(400);
			expect(await response.json()).toEqual({ error: "Invalid JSON body" });
		});

		it("returns 400 for invalid body", async () => {
			const response = await POST(
				createMcqRequest({
					name: "",
					question: "Question?",
					choices: [
						{ choiceText: "A", isCorrect: true },
						{ choiceText: "B", isCorrect: false },
					],
				}),
			);

			expect(response.status).toBe(400);
		});

		it("returns 401 when not authenticated", async () => {
			vi.mocked(sessionCookie.getSessionPayloadFromCookies).mockResolvedValue(null);

			const response = await POST(
				createMcqRequest({
					name: "Photosynthesis",
					question: "What gas do plants absorb?",
					choices: [
						{ choiceText: "Carbon dioxide", isCorrect: true },
						{ choiceText: "Oxygen", isCorrect: false },
					],
				}),
			);

			expect(response.status).toBe(401);
		});
	});
});
