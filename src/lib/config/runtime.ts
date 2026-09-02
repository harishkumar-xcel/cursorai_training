export function isProductionRuntime(): boolean {
	return (
		process.env.NODE_ENV === "production" ||
		process.env.NEXTJS_ENV === "production" ||
		typeof process.env.CF_WORKER_NAME === "string"
	);
}

export function getSessionCookieSecure(): boolean {
	return isProductionRuntime() || process.env.SESSION_COOKIE_SECURE === "true";
}
