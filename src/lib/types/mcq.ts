export type McqChoice = {
	id: string;
	choiceText: string;
	isCorrect: boolean;
	sortOrder: number;
};

export type McqChoiceInput = {
	choiceText: string;
	isCorrect: boolean;
};

export type Mcq = {
	id: string;
	name: string;
	question: string;
	createdByUserId: string;
	createdAt: string;
	updatedAt: string;
};

export type McqWithChoices = Mcq & {
	choices: McqChoice[];
};

export type McqSummary = {
	id: string;
	name: string;
	question: string;
	createdAt: string;
	updatedAt: string;
};

export type CreateMcqInput = {
	name: string;
	question: string;
	choices: McqChoiceInput[];
};

export type UpdateMcqInput = CreateMcqInput;

export type McqAttempt = {
	id: string;
	mcqId: string;
	userId: string;
	choiceId: string;
	isCorrect: boolean;
	createdAt: string;
};

export type CreateAttemptInput = {
	choiceId: string;
};
