import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../src/app.js";

function testConfig(overrides = {}) {
  return {
    serviceName: "hushh-deep-intelligence-api",
    geminiApiKey: "test-gemini-key",
    internalApiKey: "test-internal-key",
    model: "deep-research-max-preview-04-2026",
    maxActiveJobs: 3,
    retentionMs: 24 * 60 * 60 * 1000,
    retentionHours: 24,
    enableTestUi: false,
    mockResearch: false,
    monthlyBudgetUsd: 10_000,
    estimatedJobCostUsd: 7,
    rateLimitWindowMs: 60_000,
    rateLimitMax: 100,
    jobTimeoutMs: 60 * 60 * 1000,
    ...overrides,
  };
}

async function request(app, { method = "GET", path = "/", body, headers = {} } = {}) {
  const server = app.listen(0);
  try {
    await new Promise((resolve) => server.once("listening", resolve));
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await response.json();
    return { response, json };
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("health returns runtime status without secrets", async () => {
  const app = createApp({ config: testConfig() });
  const { response, json } = await request(app, { path: "/health" });

  assert.equal(response.status, 200);
  assert.equal(json.status, "ok");
  assert.equal(json.model, "deep-research-max-preview-04-2026");
  assert.equal(json.authConfigured, true);
  assert.equal(Object.hasOwn(json, "geminiApiKey"), false);
});

test("v1 routes require internal auth", async () => {
  const app = createApp({ config: testConfig() });
  const { response, json } = await request(app, { path: "/v1/intelligence/reports/missing" });

  assert.equal(response.status, 401);
  assert.equal(json.success, false);
  assert.equal(json.error.code, "unauthorized");
});

test("starts and completes a sanitized report with a mocked Gemini client", async () => {
  const geminiClient = {
    startReport: async () => ({ id: "interaction-1", status: "in_progress" }),
    getReport: async () => ({
      id: "interaction-1",
      status: "completed",
      output_text:
        "Summary: Ada has a public profile at https://www.linkedin.com/in/ada-lovelace and email ada@example.com.",
    }),
  };
  const app = createApp({ config: testConfig(), geminiClient });

  const started = await request(app, {
    method: "POST",
    path: "/v1/intelligence/reports",
    headers: { Authorization: "Bearer test-internal-key" },
    body: {
      subject: {
        name: "Ada Lovelace",
        location: { city: "London", country: "United Kingdom" },
      },
      consent: {
        accepted: true,
        purpose: "self_audit",
      },
    },
  });

  assert.equal(started.response.status, 202);
  assert.equal(started.json.status, "in_progress");

  const completed = await request(app, {
    path: `/v1/intelligence/reports/${started.json.jobId}`,
    headers: { Authorization: "Bearer test-internal-key" },
  });

  assert.equal(completed.response.status, 200);
  assert.equal(completed.json.status, "completed");
  assert.match(completed.json.report.summary, /\[redacted-email\]/);
  assert.deepEqual(completed.json.report.publicProfiles, [
    { platform: "linkedin", url: "https://www.linkedin.com/in/ada-lovelace" },
  ]);
});
