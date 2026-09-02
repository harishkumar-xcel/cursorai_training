import { NextResponse } from "next/server";

export function handleAuthRouteError(error: unknown): NextResponse {
	if (error instanceof Error) {
		if (error.message.includes("SESSION_SECRET is not configured")) {
			return NextResponse.json(
				{ error: "Authentication is not configured on the server. Contact the administrator." },
				{ status: 503 },
			);
		}

		if (error.message.includes("D1_ERROR") || error.message.includes("no such table")) {
			return NextResponse.json(
				{ error: "The user database is not available. Contact the administrator." },
				{ status: 503 },
			);
		}
	}

	console.error(error);

	return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
