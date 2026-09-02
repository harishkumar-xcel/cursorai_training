import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/logout-button";
import { getSessionPayloadFromCookies } from "@/lib/auth/session-cookie";
import { getUserById } from "@/lib/services/user-service";

export default async function McqPage() {
	const session = await getSessionPayloadFromCookies();

	if (!session) {
		redirect("/login");
	}

	const user = await getUserById(session.userId);

	if (!user) {
		redirect("/login");
	}

	return (
		<div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-6 p-6 md:p-10">
			<header className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">
						Welcome, {user.firstName} {user.lastName}
					</h1>
					<p className="text-muted-foreground">GreenField Quiz Maker</p>
				</div>
				<LogoutButton />
			</header>
			<div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
				<p>Your multiple-choice question bank will be built here.</p>
			</div>
		</div>
	);
}
