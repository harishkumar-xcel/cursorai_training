"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, MoreVertical, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

type McqListItem = {
	id: string;
	name: string;
	question: string;
	createdAt: string;
	updatedAt: string;
};

export function McqList() {
	const router = useRouter();
	const [mcqs, setMcqs] = useState<McqListItem[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [deleteTarget, setDeleteTarget] = useState<McqListItem | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	useEffect(() => {
		async function loadMcqs() {
			try {
				const response = await fetch("/api/mcqs", { credentials: "include" });
				const data = (await response.json()) as { mcqs?: McqListItem[]; error?: string };

				if (!response.ok) {
					setError(data.error ?? "Failed to load questions");
					return;
				}

				setMcqs(data.mcqs ?? []);
			} catch {
				setError("Failed to load questions");
			} finally {
				setIsLoading(false);
			}
		}

		void loadMcqs();
	}, []);

	async function handleDelete() {
		if (!deleteTarget) {
			return;
		}

		setIsDeleting(true);
		setError(null);

		try {
			const response = await fetch(`/api/mcqs/${deleteTarget.id}`, {
				method: "DELETE",
				credentials: "include",
			});

			const data = (await response.json()) as { error?: string };

			if (!response.ok) {
				setError(data.error ?? "Failed to delete question");
				return;
			}

			setMcqs((current) => current.filter((mcq) => mcq.id !== deleteTarget.id));
			setDeleteTarget(null);
			router.refresh();
		} catch {
			setError("Failed to delete question");
		} finally {
			setIsDeleting(false);
		}
	}

	if (isLoading) {
		return <p className="text-muted-foreground">Loading questions...</p>;
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between gap-4">
				<p className="text-sm text-muted-foreground">
					{mcqs.length === 0
						? "No questions yet. Create your first multiple-choice question."
						: `${mcqs.length} question${mcqs.length === 1 ? "" : "s"}`}
				</p>
				<Button render={<Link href="/mcq/new" />}>Create question</Button>
			</div>

			{error ? <p className="text-sm text-destructive">{error}</p> : null}

			<div className="rounded-xl border bg-card text-card-foreground shadow-sm">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Question</TableHead>
							<TableHead className="w-[80px] text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{mcqs.length === 0 ? (
							<TableRow>
								<TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
									No questions to display.
								</TableCell>
							</TableRow>
						) : (
							mcqs.map((mcq) => (
								<TableRow key={mcq.id}>
									<TableCell className="font-medium">{mcq.name}</TableCell>
									<TableCell className="max-w-md truncate text-muted-foreground">
										{mcq.question}
									</TableCell>
									<TableCell className="text-right">
										<DropdownMenu>
											<DropdownMenuTrigger
												render={
													<Button variant="ghost" size="icon-sm" aria-label="Open actions" />
												}
											>
												<MoreVertical />
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem
													onClick={() => router.push(`/mcq/${mcq.id}/edit`)}
												>
													<Pencil />
													Edit
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() => router.push(`/mcq/${mcq.id}/preview`)}
												>
													<Eye />
													Preview
												</DropdownMenuItem>
												<DropdownMenuItem
													variant="destructive"
													onClick={() => setDeleteTarget(mcq)}
												>
													<Trash2 />
													Delete
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			<Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
				<DialogContent showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>Delete question?</DialogTitle>
						<DialogDescription>
							This will permanently delete &quot;{deleteTarget?.name}&quot; and all related
							choices and attempts.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={() => void handleDelete()} disabled={isDeleting}>
							{isDeleting ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
