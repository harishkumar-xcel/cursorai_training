import { redirect } from "next/navigation";

import { McqPreview } from "@/components/mcq-preview";
import { McqPageHeader } from "@/components/mcq-page-header";
import { getSessionPayloadFromCookies } from "@/lib/auth/session-cookie";
import { getUserById } from "@/lib/services/user-service";

type PreviewMcqPageProps = {
	params: Promise<{ id: string }>;
};

export default async function PreviewMcqPage({ params }: PreviewMcqPageProps) {
	const session = await getSessionPayloadFromCookies();

	if (!session) {
		redirect("/login");
	}

	const user = await getUserById(session.userId);

	if (!user) {
		redirect("/login");
	}

	const { id } = await params;

	return (
		<div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-6 p-6 md:p-10">
			<McqPageHeader title="Preview question" />
			<McqPreview mcqId={id} />
		</div>
	);
}
