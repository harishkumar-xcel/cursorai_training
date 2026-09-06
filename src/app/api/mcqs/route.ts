import { NextRequest, NextResponse } from "next/server";

import { handleMcqRouteError } from "@/lib/api/handle-mcq-route-error";
import { getSessionPayloadFromCookies } from "@/lib/auth/session-cookie";
import { createMcq, listMcqsByUserId } from "@/lib/services/mcq-service";
import type { McqSummary, McqWithChoices } from "@/lib/types/mcq";
import { createMcqSchema } from "@/lib/validations/mcq";

function serializeMcqSummary(mcq: McqSummary) {
	return {
		id: mcq.id,
		name: mcq.name,
		question: mcq.question,
		createdAt: mcq.createdAt,
		updatedAt: mcq.updatedAt,
	};
}

function serializeMcqWithChoices(mcq: McqWithChoices, includeAnswers = true) {
	return {
		id: mcq.id,
		name: mcq.name,
		question: mcq.question,
		createdAt: mcq.createdAt,
		updatedAt: mcq.updatedAt,
		choices: mcq.choices.map((choice) => ({
			id: choice.id,
			choiceText: choice.choiceText,
			sortOrder: choice.sortOrder,
			...(includeAnswers ? { isCorrect: choice.isCorrect } : {}),
		})),
	};
}

export async function GET() {
	const session = await getSessionPayloadFromCookies();

	if (!session) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}

	try {
		const mcqs = await listMcqsByUserId(session.userId);

		return NextResponse.json({
			mcqs: mcqs.map(serializeMcqSummary),
		});
	} catch (error) {
		return handleMcqRouteError(error);
	}
}

export async function POST(request: NextRequest) {
	const session = await getSessionPayloadFromCookies();

	if (!session) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}

	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const parsed = createMcqSchema.safeParse(body);

	if (!parsed.success) {
		return NextResponse.json(
			{ error: parsed.error.issues[0]?.message ?? "Validation error" },
			{ status: 400 },
		);
	}

	try {
		const mcq = await createMcq(session.userId, parsed.data);

		return NextResponse.json({ mcq: serializeMcqWithChoices(mcq, true) }, { status: 201 });
	} catch (error) {
		return handleMcqRouteError(error);
	}
}
