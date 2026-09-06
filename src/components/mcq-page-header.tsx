import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { getSessionPayloadFromCookies } from "@/lib/auth/session-cookie";
import { getUserById } from "@/lib/services/user-service";

type McqPageHeaderProps = {
	title: string;
	description?: string;
};

export async function McqPageHeader({ title, description }: McqPageHeaderProps) {
	const session = await getSessionPayloadFromCookies();
	const user = session ? await getUserById(session.userId) : null;

	return (
		<header className="flex items-center justify-between gap-4">
			<div>
				<h1 className="text-2xl font-semibold">{title}</h1>
				<p className="text-muted-foreground">
					{description ??
						(user ? `Welcome, ${user.firstName} ${user.lastName}` : "GreenField Quiz Maker")}
				</p>
			</div>
			<div className="flex items-center gap-2">
				<Link
					href="/mcq"
					className="text-sm text-muted-foreground underline-offset-4 hover:underline"
				>
					All questions
				</Link>
				<LogoutButton />
			</div>
		</header>
	);
}
