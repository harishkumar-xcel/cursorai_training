"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
	const router = useRouter();
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);

		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}

		setIsSubmitting(true);

		try {
			const response = await fetch("/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					firstName,
					lastName,
					email,
					password,
				}),
			});

			const data = (await response.json()) as { error?: string };

			if (!response.ok) {
				setError(data.error ?? "Registration failed");
				return;
			}

			router.push("/mcq");
		} catch {
			setError("Registration failed");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<Card {...props}>
			<CardHeader>
				<CardTitle>Create an account</CardTitle>
				<CardDescription>Enter your information below to create your account</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit}>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="first-name">First Name</FieldLabel>
							<Input
								id="first-name"
								type="text"
								placeholder="Jane"
								required
								value={firstName}
								onChange={(event) => setFirstName(event.target.value)}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="last-name">Last Name</FieldLabel>
							<Input
								id="last-name"
								type="text"
								placeholder="Smith"
								required
								value={lastName}
								onChange={(event) => setLastName(event.target.value)}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="email">Email</FieldLabel>
							<Input
								id="email"
								type="email"
								placeholder="m@example.com"
								required
								value={email}
								onChange={(event) => setEmail(event.target.value)}
							/>
							<FieldDescription>
								We&apos;ll use this to contact you. We will not share your email with anyone
								else.
							</FieldDescription>
						</Field>
						<Field>
							<FieldLabel htmlFor="password">Password</FieldLabel>
							<Input
								id="password"
								type="password"
								required
								value={password}
								onChange={(event) => setPassword(event.target.value)}
							/>
							<FieldDescription>Must be at least 8 characters long.</FieldDescription>
						</Field>
						<Field>
							<FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
							<Input
								id="confirm-password"
								type="password"
								required
								value={confirmPassword}
								onChange={(event) => setConfirmPassword(event.target.value)}
							/>
							<FieldDescription>Please confirm your password.</FieldDescription>
						</Field>
						{error ? <FieldError>{error}</FieldError> : null}
						<FieldGroup>
							<Field>
								<Button type="submit" disabled={isSubmitting}>
									{isSubmitting ? "Creating account..." : "Create Account"}
								</Button>
								<FieldDescription className="px-6 text-center">
									Already have an account?{" "}
									<Link href="/login" className="underline underline-offset-4">
										Sign in
									</Link>
								</FieldDescription>
							</Field>
						</FieldGroup>
					</FieldGroup>
				</form>
			</CardContent>
		</Card>
	);
}
