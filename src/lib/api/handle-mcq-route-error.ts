import { NextResponse } from "next/server";

export function handleMcqRouteError(error: unknown): NextResponse {
	if (error instanceof Error) {
		if (error.message === "MCQ not found") {
			return NextResponse.json({ error: "Question not found" }, { status: 404 });
		}

		if (error.message === "Choice not found") {
			return NextResponse.json({ error: "Invalid choice for this question" }, { status: 400 });
		}

		if (error.message.includes("D1_ERROR") || error.message.includes("no such table")) {
			return NextResponse.json(
				{ error: "The question database is not available. Contact the administrator." },
				{ status: 503 },
			);
		}
	}

	console.error(error);

	return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
