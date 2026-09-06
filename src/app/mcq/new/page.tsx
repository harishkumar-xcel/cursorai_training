import { redirect } from "next/navigation";

import { McqForm } from "@/components/mcq-form";
import { McqPageHeader } from "@/components/mcq-page-header";
import { getSessionPayloadFromCookies } from "@/lib/auth/session-cookie";
import { getUserById } from "@/lib/services/user-service";

export default async function NewMcqPage() {
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
			<McqPageHeader title="Create question" />
			<McqForm />
		</div>
	);
}
