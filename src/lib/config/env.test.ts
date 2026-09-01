import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("environment configuration", () => {
	it(".dev.vars.example contains SESSION_SECRET placeholder", () => {
		const examplePath = join(import.meta.dirname, "../../../.dev.vars.example");
		const contents = readFileSync(examplePath, "utf-8");

		expect(contents).toMatch(/SESSION_SECRET\s*=/);
	});
});
