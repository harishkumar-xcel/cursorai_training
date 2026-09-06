"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChoiceFormValue = {
	choiceText: string;
	isCorrect: boolean;
};

type McqFormProps = {
	mcqId?: string;
};

const defaultChoices = (): ChoiceFormValue[] => [
	{ choiceText: "", isCorrect: true },
	{ choiceText: "", isCorrect: false },
];

export function McqForm({ mcqId }: McqFormProps) {
	const router = useRouter();
	const isEditing = Boolean(mcqId);

	const [name, setName] = useState("");
	const [question, setQuestion] = useState("");
	const [choices, setChoices] = useState<ChoiceFormValue[]>(defaultChoices);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(isEditing);
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (!mcqId) {
			return;
		}

		async function loadMcq() {
			try {
				const response = await fetch(`/api/mcqs/${mcqId}?includeAnswers=true`, {
					credentials: "include",
				});
				const data = (await response.json()) as {
					mcq?: {
						name: string;
						question: string;
						choices: Array<{
							choiceText: string;
							isCorrect?: boolean;
						}>;
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
				setChoices(
					data.mcq.choices.map((choice) => ({
						choiceText: choice.choiceText,
						isCorrect: Boolean(choice.isCorrect),
					})),
				);
			} catch {
				setError("Failed to load question");
			} finally {
				setIsLoading(false);
			}
		}

		void loadMcq();
	}, [mcqId]);

	function updateChoice(index: number, value: Partial<ChoiceFormValue>) {
		setChoices((current) =>
			current.map((choice, choiceIndex) =>
				choiceIndex === index ? { ...choice, ...value } : choice,
			),
		);
	}

	function setCorrectChoice(index: number) {
		setChoices((current) =>
			current.map((choice, choiceIndex) => ({
				...choice,
				isCorrect: choiceIndex === index,
			})),
		);
	}

	function addChoice() {
		if (choices.length >= 6) {
			return;
		}

		setChoices((current) => [...current, { choiceText: "", isCorrect: false }]);
	}

	function removeChoice(index: number) {
		if (choices.length <= 2) {
			return;
		}

		setChoices((current) => {
			const next = current.filter((_, choiceIndex) => choiceIndex !== index);

			if (!next.some((choice) => choice.isCorrect)) {
				next[0] = { ...next[0], isCorrect: true };
			}

			return next;
		});
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setIsSubmitting(true);

		const payload = {
			name,
			question,
			choices,
		};

		try {
			const response = await fetch(isEditing ? `/api/mcqs/${mcqId}` : "/api/mcqs", {
				method: isEditing ? "PUT" : "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify(payload),
			});

			const data = (await response.json()) as { error?: string };

			if (!response.ok) {
				setError(data.error ?? "Failed to save question");
				return;
			}

			router.push("/mcq");
			router.refresh();
		} catch {
			setError("Failed to save question");
		} finally {
			setIsSubmitting(false);
		}
	}

	if (isLoading) {
		return <p className="text-muted-foreground">Loading question...</p>;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{isEditing ? "Edit question" : "Create question"}</CardTitle>
				<CardDescription>
					Add a name, the question prompt, and between two and six choices. Mark exactly one
					choice as correct.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit}>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="name">Name</FieldLabel>
							<Input
								id="name"
								value={name}
								onChange={(event) => setName(event.target.value)}
								placeholder="Photosynthesis basics"
								required
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="question">Question</FieldLabel>
							<Textarea
								id="question"
								value={question}
								onChange={(event) => setQuestion(event.target.value)}
								placeholder="What gas do plants absorb during photosynthesis?"
								required
							/>
						</Field>

						<div className="flex flex-col gap-3">
							<div className="flex items-center justify-between gap-4">
								<p className="text-sm font-medium">Choices</p>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={addChoice}
									disabled={choices.length >= 6}
								>
									<Plus />
									Add choice
								</Button>
							</div>

							{choices.map((choice, index) => (
								<div
									key={`choice-${index}`}
									className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center"
								>
									<label className="flex items-center gap-2 text-sm">
										<input
											type="radio"
											name="correct-choice"
											checked={choice.isCorrect}
											onChange={() => setCorrectChoice(index)}
											className="size-4"
										/>
										<span className="text-muted-foreground">Correct</span>
									</label>
									<Input
										value={choice.choiceText}
										onChange={(event) =>
											updateChoice(index, { choiceText: event.target.value })
										}
										placeholder={`Choice ${index + 1}`}
										required
										className="flex-1"
									/>
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										onClick={() => removeChoice(index)}
										disabled={choices.length <= 2}
										aria-label={`Remove choice ${index + 1}`}
										className={cn(choices.length <= 2 && "opacity-50")}
									>
										<Trash2 />
									</Button>
								</div>
							))}
						</div>

						{error ? <FieldError>{error}</FieldError> : null}

						<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
							<Button
								type="button"
								variant="outline"
								render={<Link href="/mcq" />}
								disabled={isSubmitting}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "Saving..." : "Save"}
							</Button>
						</div>
					</FieldGroup>
				</form>
			</CardContent>
		</Card>
	);
}
