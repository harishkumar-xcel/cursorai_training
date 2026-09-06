"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { FieldError } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type PreviewChoice = {
	id: string;
	choiceText: string;
	sortOrder: number;
};

type McqPreviewProps = {
	mcqId: string;
};

export function McqPreview({ mcqId }: McqPreviewProps) {
	const [name, setName] = useState("");
	const [question, setQuestion] = useState("");
	const [choices, setChoices] = useState<PreviewChoice[]>([]);
	const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
	const [result, setResult] = useState<{ isCorrect: boolean } | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		async function loadMcq() {
			try {
				const response = await fetch(`/api/mcqs/${mcqId}`, { credentials: "include" });
				const data = (await response.json()) as {
					mcq?: {
						name: string;
						question: string;
						choices: PreviewChoice[];
					};
					error?: string;
				};

				if (!response.ok) {
					setError(data.error ?? "Failed to load question");
					return;
				}

				if (!data.mcq) {
					setError("Failed to load question");
					return;
				}

				setName(data.mcq.name);
				setQuestion(data.mcq.question);
				setChoices(data.mcq.choices);
			} catch {
				setError("Failed to load question");
			} finally {
				setIsLoading(false);
			}
		}

		void loadMcq();
	}, [mcqId]);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!selectedChoiceId) {
			setError("Select an answer before submitting");
			return;
		}

		setError(null);
		setIsSubmitting(true);

		try {
			const response = await fetch(`/api/mcqs/${mcqId}/attempts`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ choiceId: selectedChoiceId }),
			});

			const data = (await response.json()) as {
				attempt?: { isCorrect: boolean };
				error?: string;
			};

			if (!response.ok) {
				setError(data.error ?? "Failed to submit answer");
				return;
			}

			setResult({ isCorrect: Boolean(data.attempt?.isCorrect) });
		} catch {
			setError("Failed to submit answer");
		} finally {
			setIsSubmitting(false);
		}
	}

	if (isLoading) {
		return <p className="text-muted-foreground">Loading preview...</p>;
	}

	if (error && choices.length === 0) {
		return <p className="text-sm text-destructive">{error}</p>;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{name}</CardTitle>
				<CardDescription>Preview mode — submit an answer to record an attempt.</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<p className="text-base">{question}</p>

					<div className="flex flex-col gap-2">
						{choices.map((choice) => (
							<label
								key={choice.id}
								className={cn(
									"flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
									selectedChoiceId === choice.id && "border-primary bg-muted/40",
									result && "cursor-default",
								)}
							>
								<input
									type="radio"
									name="preview-choice"
									value={choice.id}
									checked={selectedChoiceId === choice.id}
									onChange={() => setSelectedChoiceId(choice.id)}
									disabled={result !== null}
									className="size-4"
								/>
								<span>{choice.choiceText}</span>
							</label>
						))}
					</div>

					{result ? (
						<p
							className={cn(
								"text-sm font-medium",
								result.isCorrect ? "text-green-600 dark:text-green-400" : "text-destructive",
							)}
						>
							{result.isCorrect ? "Correct!" : "Incorrect. Try reviewing the question."}
						</p>
					) : null}

					{error ? <FieldError>{error}</FieldError> : null}

					<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<Button type="button" variant="outline" render={<Link href="/mcq" />}>
							Back to list
						</Button>
						{!result ? (
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "Submitting..." : "Submit answer"}
							</Button>
						) : (
							<Button
								type="button"
								variant="outline"
								render={<Link href={`/mcq/${mcqId}/edit`} />}
							>
								Edit question
							</Button>
						)}
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
