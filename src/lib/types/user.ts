export type User = {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	createdAt: string;
	updatedAt: string;
};

export type UserWithHash = User & {
	passwordHash: string;
};

export type CreateUserInput = {
	firstName: string;
	lastName: string;
	email: string;
	password: string;
};

export type UpdateUserInput = {
	firstName?: string;
	lastName?: string;
	password?: string;
};

export type SessionPayload = {
	userId: string;
	email: string;
	exp: number;
};
