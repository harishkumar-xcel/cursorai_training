import { cookies } from "next/headers";

import { createSessionToken, getSessionCookieOptions, parseSessionToken } from "@/lib/auth/session";
import type { SessionPayload } from "@/lib/types/user";

export const SESSION_COOKIE_NAME = "session";

export async function setSessionCookie(userId: string, email: string): Promise<void> {
	const token = await createSessionToken({ userId, email });
	const options = getSessionCookieOptions();

	(await cookies()).set(SESSION_COOKIE_NAME, token, options);
}

export async function clearSessionCookie(): Promise<void> {
	const options = getSessionCookieOptions();

	(await cookies()).set(SESSION_COOKIE_NAME, "", {
		...options,
		maxAge: 0,
	});
}

export async function getSessionPayloadFromCookies(): Promise<SessionPayload | null> {
	const sessionCookie = (await cookies()).get(SESSION_COOKIE_NAME);

	if (!sessionCookie?.value) {
		return null;
	}

	return parseSessionToken(sessionCookie.value);
}
