import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-8 p-6 md:p-10">
			<div className="flex max-w-lg flex-col items-center gap-4 text-center">
				<h1 className="text-3xl font-semibold tracking-tight">GreenField Quiz Maker</h1>
				<p className="text-muted-foreground">
					Build and manage multiple-choice question banks for your classroom.
				</p>
			</div>
			<div className="flex flex-col gap-3 sm:flex-row">
				<Link href="/register" className={cn(buttonVariants())}>
					Create account
				</Link>
				<Link href="/login" className={cn(buttonVariants({ variant: "outline" }))}>
					Log in
				</Link>
			</div>
		</div>
	);
}
