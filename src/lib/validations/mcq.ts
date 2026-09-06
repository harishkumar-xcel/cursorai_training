import { z } from "zod";

const choiceInputSchema = z.object({
	choiceText: z.string().trim().min(1, "Choice text is required").max(500),
	isCorrect: z.boolean(),
});

export const createMcqSchema = z
	.object({
		name: z.string().trim().min(1, "Name is required").max(200),
		question: z.string().trim().min(1, "Question is required").max(2000),
		choices: z
			.array(choiceInputSchema)
			.min(2, "At least two choices are required")
			.max(6, "At most six choices are allowed"),
	})
	.refine((data) => data.choices.filter((choice) => choice.isCorrect).length === 1, {
		message: "Exactly one choice must be marked as correct",
		path: ["choices"],
	});

export const updateMcqSchema = createMcqSchema;

export const createAttemptSchema = z.object({
	choiceId: z.string().trim().min(1, "Choice is required"),
});

export type CreateMcqSchemaInput = z.infer<typeof createMcqSchema>;
export type UpdateMcqSchemaInput = z.infer<typeof updateMcqSchema>;
export type CreateAttemptSchemaInput = z.infer<typeof createAttemptSchema>;
