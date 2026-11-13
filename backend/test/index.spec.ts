import {
	env,
	createExecutionContext,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

const testEnv = {
	...env,
	ADMIN_PASSWORD: "test-password",
	SESSION_SECRET: "test-session-secret-at-least-32-characters",
};

describe("RA-MORA API", () => {
	it("allows the GitHub Pages site to make API requests", async () => {
		const request = new IncomingRequest(
			"https://example.com/api/enquiries",
			{
				method: "OPTIONS",
				headers: {
					Origin: "https://sahil-patel-2510.github.io",
					"Access-Control-Request-Method": "POST",
					"Access-Control-Request-Headers": "content-type",
				},
			}
		);

		const response = await worker.fetch(
			request,
			testEnv,
			createExecutionContext()
		);

		expect(response.status).toBe(204);
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
			"https://sahil-patel-2510.github.io"
		);
	});

	it("rejects requests from origins outside the allowlist", async () => {
		const request = new IncomingRequest(
			"https://example.com/api/health",
			{
				headers: {
					Origin: "https://untrusted.example",
				},
			}
		);

		const response = await worker.fetch(
			request,
			testEnv,
			createExecutionContext()
		);

		expect(response.status).toBe(403);
	});

	it("sets cross-site admin cookies securely for the live site", async () => {
		const request = new IncomingRequest(
			"https://example.com/api/admin/login",
			{
				method: "POST",
				headers: {
					Origin: "https://sahil-patel-2510.github.io",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ password: "test-password" }),
			}
		);

		const response = await worker.fetch(
			request,
			testEnv,
			createExecutionContext()
		);
		const cookie = response.headers.get("Set-Cookie");

		expect(response.status).toBe(200);
		expect(cookie).toContain("HttpOnly");
		expect(cookie).toContain("SameSite=None");
		expect(cookie).toContain("Secure");
	});
});
