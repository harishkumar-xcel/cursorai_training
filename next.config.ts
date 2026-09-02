import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

function loadDevVars(): void {
	const devVarsPath = join(__dirname, ".dev.vars");

	if (!existsSync(devVarsPath)) {
		return;
	}

	for (const line of readFileSync(devVarsPath, "utf-8").split("\n")) {
		const trimmed = line.trim();

		if (!trimmed || trimmed.startsWith("#")) {
			continue;
		}

		const separatorIndex = trimmed.indexOf("=");

		if (separatorIndex === -1) {
			continue;
		}

		const key = trimmed.slice(0, separatorIndex).trim();
		const value = trimmed.slice(separatorIndex + 1).trim();

		if (key && process.env[key] === undefined) {
			process.env[key] = value;
		}
	}
}

loadDevVars();

const nextConfig: NextConfig = {
	// Pin the workspace root so a stray lockfile elsewhere on the machine cannot
	// make Turbopack infer the wrong project directory.
	turbopack: {
		root: __dirname,
	},
};

export default nextConfig;

// Enable calling `getCloudflareContext()` in `next dev`.
// See https://opennext.js.org/cloudflare/bindings#local-access-to-bindings.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
