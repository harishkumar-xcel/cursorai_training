export function shouldRedirectToMcq(pathname: string, isAuthenticated: boolean): boolean {
	return isAuthenticated && (pathname === "/login" || pathname === "/register");
}

export function shouldRedirectToLogin(pathname: string, isAuthenticated: boolean): boolean {
	return !isAuthenticated && pathname === "/mcq";
}

export function getAuthRedirectPath(): string {
	return "/mcq";
}

export function resolveAuthRedirect(pathname: string, isAuthenticated: boolean): string | null {
	if (shouldRedirectToLogin(pathname, isAuthenticated)) {
		return "/login";
	}

	if (shouldRedirectToMcq(pathname, isAuthenticated)) {
		return getAuthRedirectPath();
	}

	if (isAuthenticated && pathname === "/") {
		return getAuthRedirectPath();
	}

	return null;
}
