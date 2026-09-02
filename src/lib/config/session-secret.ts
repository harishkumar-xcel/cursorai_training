export function getSessionSecret(): string {
	const secret = process.env.SESSION_SECRET?.trim();

	if (!secret) {
		throw new Error("SESSION_SECRET is not configured");
	}

	return secret;
}
