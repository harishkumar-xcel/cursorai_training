import { type NextRequest, NextResponse } from "next/server";

import { resolveAuthRedirect } from "@/lib/auth/route-guards";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie";
import { parseSessionToken } from "@/lib/auth/session";

export async function middleware(request: NextRequest) {
	const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
	let isAuthenticated = false;

	if (token) {
		const session = await parseSessionToken(token);
		isAuthenticated = session !== null;
	}

	const redirectPath = resolveAuthRedirect(request.nextUrl.pathname, isAuthenticated);

	if (redirectPath) {
		return NextResponse.redirect(new URL(redirectPath, request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/", "/login", "/register", "/mcq", "/mcq/:path*"],
};
