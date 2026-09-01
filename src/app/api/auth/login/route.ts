import { NextRequest, NextResponse } from "next/server";

import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session-cookie";
import { getUserByEmail } from "@/lib/services/user-service";
import { loginSchema } from "@/lib/validations/auth";

const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";

export async function POST(request: NextRequest) {
	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const parsed = loginSchema.safeParse(body);

	if (!parsed.success) {
		return NextResponse.json(
			{ error: parsed.error.issues[0]?.message ?? "Validation error" },
			{ status: 400 },
		);
	}

	const user = await getUserByEmail(parsed.data.email);

	if (!user) {
		return NextResponse.json({ error: INVALID_CREDENTIALS_MESSAGE }, { status: 401 });
	}

	const passwordMatches = await verifyPassword(parsed.data.password, user.passwordHash);

	if (!passwordMatches) {
		return NextResponse.json({ error: INVALID_CREDENTIALS_MESSAGE }, { status: 401 });
	}

	await setSessionCookie(user.id, user.email);

	return NextResponse.json({
		user: {
			id: user.id,
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		},
	});
}
