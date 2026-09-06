import { NextRequest, NextResponse } from "next/server";

import { handleMcqRouteError } from "@/lib/api/handle-mcq-route-error";
import { getSessionPayloadFromCookies } from "@/lib/auth/session-cookie";
import { deleteMcq, getMcqById, updateMcq } from "@/lib/services/mcq-service";
import type { McqWithChoices } from "@/lib/types/mcq";
import { updateMcqSchema } from "@/lib/validations/mcq";

type RouteContext = {
	params: Promise<{ id: string }>;
};

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

export async function GET(request: NextRequest, context: RouteContext) {
	const session = await getSessionPayloadFromCookies();

	if (!session) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}

	const { id } = await context.params;
	const includeAnswers = request.nextUrl.searchParams.get("includeAnswers") === "true";

	try {
		const mcq = await getMcqById(id, session.userId, { includeAnswers });

		if (!mcq) {
			return NextResponse.json({ error: "Question not found" }, { status: 404 });
		}

		return NextResponse.json({
			mcq: serializeMcqWithChoices(mcq, includeAnswers),
		});
	} catch (error) {
		return handleMcqRouteError(error);
	}
}

export async function PUT(request: NextRequest, context: RouteContext) {
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

	const parsed = updateMcqSchema.safeParse(body);

	if (!parsed.success) {
		return NextResponse.json(
			{ error: parsed.error.issues[0]?.message ?? "Validation error" },
			{ status: 400 },
		);
	}

	try {
		const mcq = await updateMcq(id, session.userId, parsed.data);

		return NextResponse.json({ mcq: serializeMcqWithChoices(mcq, true) });
	} catch (error) {
		return handleMcqRouteError(error);
	}
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
	const session = await getSessionPayloadFromCookies();

	if (!session) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}

	const { id } = await context.params;

	try {
		await deleteMcq(id, session.userId);

		return NextResponse.json({ success: true });
	} catch (error) {
		return handleMcqRouteError(error);
	}
}
