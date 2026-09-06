import { NextRequest, NextResponse } from "next/server";

import { handleMcqRouteError } from "@/lib/api/handle-mcq-route-error";
import { getSessionPayloadFromCookies } from "@/lib/auth/session-cookie";
import { createAttempt } from "@/lib/services/mcq-service";
import { createAttemptSchema } from "@/lib/validations/mcq";

type RouteContext = {
	params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
	const session = await getSessionPayloadFromCookies();

	if (!session) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}

	const { id } = await context.params;

	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const parsed = createAttemptSchema.safeParse(body);

	if (!parsed.success) {
		return NextResponse.json(
			{ error: parsed.error.issues[0]?.message ?? "Validation error" },
			{ status: 400 },
		);
	}

	try {
		const attempt = await createAttempt(id, session.userId, parsed.data);

		return NextResponse.json(
			{
				attempt: {
					id: attempt.id,
					mcqId: attempt.mcqId,
					choiceId: attempt.choiceId,
					isCorrect: attempt.isCorrect,
					createdAt: attempt.createdAt,
				},
			},
			{ status: 201 },
		);
	} catch (error) {
		return handleMcqRouteError(error);
	}
}
