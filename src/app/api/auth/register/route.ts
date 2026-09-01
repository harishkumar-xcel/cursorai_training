import { NextRequest, NextResponse } from "next/server";

import { setSessionCookie } from "@/lib/auth/session-cookie";
import { createUser, getUserByEmail } from "@/lib/services/user-service";
import { registerSchema } from "@/lib/validations/auth";

export async function POST(request: NextRequest) {
	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const parsed = registerSchema.safeParse(body);

	if (!parsed.success) {
		return NextResponse.json(
			{ error: parsed.error.issues[0]?.message ?? "Validation error" },
			{ status: 400 },
		);
	}

	const existingUser = await getUserByEmail(parsed.data.email);

	if (existingUser) {
		return NextResponse.json(
			{ error: "An account with this email already exists" },
			{ status: 409 },
		);
	}

	const user = await createUser(parsed.data);

	await setSessionCookie(user.id, user.email);

	return NextResponse.json({ user }, { status: 201 });
}
