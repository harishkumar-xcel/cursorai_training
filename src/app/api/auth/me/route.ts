import { NextResponse } from "next/server";

import { getSessionPayloadFromCookies } from "@/lib/auth/session-cookie";
import { getUserById } from "@/lib/services/user-service";

export async function GET() {
	const session = await getSessionPayloadFromCookies();

	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const user = await getUserById(session.userId);

	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	return NextResponse.json({ user });
}
