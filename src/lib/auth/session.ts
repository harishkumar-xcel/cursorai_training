import { getSessionSecret } from "@/lib/config/session-secret";
import type { SessionPayload } from "@/lib/types/user";
import { getSessionCookieSecure } from "@/lib/config/runtime";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function encodeBase64Url(value: string): string {
	return Buffer.from(value, "utf-8").toString("base64url");
}

function decodeBase64Url(value: string): string {
	return Buffer.from(value, "base64url").toString("utf-8");
}

async function signPayload(payload: string, secret: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);

	const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));

	return Buffer.from(signature).toString("base64url");
}

async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["verify"],
	);

	return crypto.subtle.verify(
		"HMAC",
		key,
		Buffer.from(signature, "base64url"),
		new TextEncoder().encode(payload),
	);
}

export async function createSessionToken(input: {
	userId: string;
	email: string;
}): Promise<string> {
	const payload: SessionPayload = {
		userId: input.userId,
		email: input.email,
		exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
	};
	const encodedPayload = encodeBase64Url(JSON.stringify(payload));
	const signature = await signPayload(encodedPayload, getSessionSecret());

	return `${encodedPayload}.${signature}`;
}

export async function parseSessionToken(token: string): Promise<SessionPayload | null> {
	const [encodedPayload, signature] = token.split(".");

	if (!encodedPayload || !signature) {
		return null;
	}

	const secret = getSessionSecret();
	const isValid = await verifySignature(encodedPayload, signature, secret);

	if (!isValid) {
		return null;
	}

	let payload: SessionPayload;

	try {
		payload = JSON.parse(decodeBase64Url(encodedPayload)) as SessionPayload;
	} catch {
		return null;
	}

	if (!payload.userId || !payload.email || !payload.exp) {
		return null;
	}

	if (payload.exp <= Math.floor(Date.now() / 1000)) {
		return null;
	}

	return payload;
}

export function getSessionCookieOptions() {
	return {
		httpOnly: true,
		secure: getSessionCookieSecure(),
		sameSite: "lax" as const,
		path: "/",
		maxAge: SESSION_MAX_AGE_SECONDS,
	};
}
