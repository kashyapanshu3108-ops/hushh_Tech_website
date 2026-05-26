import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

const servicePath = "../cloud-run/deep-intelligence-api";

async function importFresh(path: string) {
  vi.resetModules();
  return import(path);
}

describe("deep intelligence request validation", () => {
  it("rejects missing consent", async () => {
    const { validateReportRequest } = await importFresh(`${servicePath}/src/validation.js`);

    expect(() =>
      validateReportRequest({
        subject: {
          name: "Ada Lovelace",
          location: { city: "London", country: "United Kingdom" },
        },
      }),
    ).toThrow(/consent\.accepted/);
  });

  it("rejects blank names", async () => {
    const { validateReportRequest } = await importFresh(`${servicePath}/src/validation.js`);

    expect(() =>
      validateReportRequest({
        subject: {
          name: "   ",
          location: { city: "London", country: "United Kingdom" },
        },
        consent: { accepted: true, purpose: "self_audit" },
      }),
    ).toThrow(/subject\.name/);
  });

  it("rejects exact address or GPS precision", async () => {
    const { validateReportRequest } = await importFresh(`${servicePath}/src/validation.js`);

    expect(() =>
      validateReportRequest({
        subject: {
          name: "Ada Lovelace",
          location: { city: "London", country: "United Kingdom", latitude: 51.5072 },
        },
        consent: { accepted: true, purpose: "self_audit" },
      }),
    ).toThrow(/exact address or GPS/);

    expect(() =>
      validateReportRequest({
        subject: {
          name: "Ada Lovelace",
          location: "123 Example Street, London",
        },
        consent: { accepted: true, purpose: "self_audit" },
      }),
    ).toThrow(/city, region, and country/);
  });

  it("rejects unsupported purpose and sensitive/minor terms", async () => {
    const { validateReportRequest } = await importFresh(`${servicePath}/src/validation.js`);

    expect(() =>
      validateReportRequest({
        subject: {
          name: "Ada Lovelace",
          location: { city: "London", country: "United Kingdom" },
        },
        consent: { accepted: true, purpose: "lead_scrape" },
      }),
    ).toThrow(/self_audit/);

    expect(() =>
      validateReportRequest({
        subject: {
          name: "Ada Lovelace passport",
          location: { city: "London", country: "United Kingdom" },
        },
        consent: { accepted: true, purpose: "self_audit" },
      }),
    ).toThrow(/sensitive/);

    expect(() =>
      validateReportRequest({
        subject: {
          name: "Ada Lovelace",
          age: 16,
          location: { city: "London", country: "United Kingdom" },
        },
        consent: { accepted: true, purpose: "self_audit" },
      }),
    ).toThrow(/minors/);
  });
});

describe("Gemini Deep Research client", () => {
  beforeEach(() => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "interaction-123", status: "in_progress" }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("starts Deep Research in background mode with store enabled", async () => {
    const { GeminiDeepResearchClient } = await importFresh(`${servicePath}/src/geminiClient.js`);
    const client = new GeminiDeepResearchClient({
      apiKey: "gemini-key",
      model: "deep-research-preview-04-2026",
      fetchImpl: fetchMock,
    });

    const interaction = await client.startReport({
      subject: {
        name: "Ada Lovelace",
        location: { city: "London", country: "United Kingdom" },
      },
      consent: { accepted: true, purpose: "self_audit" },
    });

    expect(interaction).toMatchObject({ id: "interaction-123" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Api-Revision": "2026-05-20",
          "x-goog-api-key": "gemini-key",
        }),
      }),
    );
    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(requestBody).toMatchObject({
      agent: "deep-research-preview-04-2026",
      background: true,
      store: true,
      agent_config: {
        type: "deep-research",
        thinking_summaries: "auto",
        visualization: "off",
        collaborative_planning: false,
      },
      tools: [{ type: "google_search" }, { type: "url_context" }, { type: "code_execution" }],
    });
  });

  it("fails cleanly when Gemini does not return an interaction id", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: "in_progress" }),
    });
    const { GeminiDeepResearchClient } = await importFresh(`${servicePath}/src/geminiClient.js`);
    const client = new GeminiDeepResearchClient({ apiKey: "gemini-key", fetchImpl: fetchMock });

    await expect(
      client.startReport({
        subject: {
          name: "Ada Lovelace",
          location: { city: "London", country: "United Kingdom" },
        },
        consent: { accepted: true, purpose: "self_audit" },
      }),
    ).rejects.toThrow(/interaction id/);
  });

  it("returns an actionable error when Gemini project access is denied", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({
        error: {
          code: "permission_denied",
          message: "Your project has been denied access. Please contact support.",
        },
      }),
    });
    const { GeminiDeepResearchClient } = await importFresh(`${servicePath}/src/geminiClient.js`);
    const client = new GeminiDeepResearchClient({ apiKey: "gemini-key", fetchImpl: fetchMock });

    await expect(
      client.startReport({
        subject: {
          name: "Ada Lovelace",
          location: { city: "London", country: "United Kingdom" },
        },
        consent: { accepted: true, purpose: "self_audit" },
      }),
    ).rejects.toThrow(/denied access/);
  });

  it("redacts secret-like values from Gemini upstream errors", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        error: {
          code: "internal",
          message: "Request failed for ?key=AIzaSySecretValueThatMustNotLeak",
        },
      }),
    });
    const { GeminiDeepResearchClient } = await importFresh(`${servicePath}/src/geminiClient.js`);
    const client = new GeminiDeepResearchClient({ apiKey: "gemini-key", fetchImpl: fetchMock });

    await expect(client.getReport("interaction-123")).rejects.toThrow(
      /Gemini Deep Research request failed: status 500; code internal; Request failed for \?key=\[redacted\]/,
    );
  });
});

describe("deep intelligence job store and sanitizer", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns in-progress status until Gemini completes", async () => {
    const { DeepIntelligenceJobStore } = await importFresh(`${servicePath}/src/jobStore.js`);
    const geminiClient = {
      startReport: vi.fn().mockResolvedValue({ id: "interaction-1", status: "in_progress" }),
      getReport: vi.fn().mockResolvedValue({ id: "interaction-1", status: "in_progress" }),
    };
    const store = new DeepIntelligenceJobStore({
      geminiClient,
      maxActiveJobs: 2,
      retentionMs: 86_400_000,
      jobTimeoutMs: 3_600_000,
      monthlyBudgetUsd: 10_000,
      estimatedJobCostUsd: 7,
    });

    const created = await store.createReport({
      subject: {
        name: "Ada Lovelace",
        location: { city: "London", country: "United Kingdom" },
      },
      consent: { accepted: true, purpose: "self_audit" },
    });
    const polled = await store.getReport(created.jobId);

    expect(created).toMatchObject({ success: true, status: "in_progress" });
    expect(polled).toMatchObject({ success: true, status: "in_progress" });
  });

  it("sanitizes completed reports and keeps source citations", async () => {
    const { DeepIntelligenceJobStore } = await importFresh(`${servicePath}/src/jobStore.js`);
    const geminiClient = {
      startReport: vi.fn().mockResolvedValue({ id: "interaction-1", status: "in_progress" }),
      getReport: vi.fn().mockResolvedValue({
        id: "interaction-1",
        status: "completed",
        outputs: [
          {
            type: "text",
            text:
              "Summary: Ada has a public profile at https://www.linkedin.com/in/ada-lovelace and email ada@example.com. Address 123 Example Street. Cannot confirm one result.",
            annotations: [{ source: "https://www.linkedin.com/in/ada-lovelace" }],
          },
        ],
      }),
    };
    const store = new DeepIntelligenceJobStore({
      geminiClient,
      maxActiveJobs: 2,
      retentionMs: 86_400_000,
      jobTimeoutMs: 3_600_000,
      monthlyBudgetUsd: 10_000,
      estimatedJobCostUsd: 7,
    });

    const created = await store.createReport({
      subject: {
        name: "Ada Lovelace",
        location: { city: "London", country: "United Kingdom" },
      },
      consent: { accepted: true, purpose: "self_audit" },
    });
    const completed = await store.getReport(created.jobId);

    expect(completed.status).toBe("completed");
    expect(completed.report.summary).toContain("[redacted-email]");
    expect(completed.report.summary).toContain("[redacted-address]");
    expect(completed.report.sourceCitations).toEqual([
      { uri: "https://www.linkedin.com/in/ada-lovelace" },
    ]);
    expect(completed.report.publicProfiles).toEqual([
      { platform: "linkedin", url: "https://www.linkedin.com/in/ada-lovelace" },
    ]);
    expect(completed.report.redactions).toEqual(["address", "email"]);
    expect(completed.report.riskFlags).toContain("identity_match_ambiguous");
  });

  it("marks failed and timed-out jobs without leaking upstream details", async () => {
    const { DeepIntelligenceJobStore } = await importFresh(`${servicePath}/src/jobStore.js`);
    let now = Date.parse("2026-05-24T00:00:00.000Z");
    const geminiClient = {
      startReport: vi.fn().mockResolvedValue({ id: "interaction-1", status: "in_progress" }),
      getReport: vi.fn().mockResolvedValue({
        id: "interaction-1",
        status: "failed",
        error: { message: "Upstream failed" },
      }),
    };
    const store = new DeepIntelligenceJobStore({
      geminiClient,
      maxActiveJobs: 2,
      retentionMs: 86_400_000,
      jobTimeoutMs: 1000,
      monthlyBudgetUsd: 10_000,
      estimatedJobCostUsd: 7,
      now: () => now,
    });

    const failedJob = await store.createReport({
      subject: {
        name: "Ada Lovelace",
        location: { city: "London", country: "United Kingdom" },
      },
      consent: { accepted: true, purpose: "self_audit" },
    });
    const failed = await store.getReport(failedJob.jobId);
    expect(failed).toMatchObject({
      success: false,
      status: "failed",
      error: { message: "Upstream failed" },
    });

    geminiClient.startReport.mockResolvedValueOnce({ id: "interaction-2", status: "in_progress" });
    const timedJob = await store.createReport({
      subject: {
        name: "Grace Hopper",
        location: { city: "Arlington", region: "Virginia", country: "United States" },
      },
      consent: { accepted: true, purpose: "rd_internal" },
    });
    now += 1500;
    const timedOut = await store.getReport(timedJob.jobId);
    expect(timedOut).toMatchObject({
      success: false,
      status: "failed",
      error: { message: "Research job timed out before completion" },
    });
  });

  it("marks jobs failed when Gemini polling throws", async () => {
    const { DeepIntelligenceJobStore } = await importFresh(`${servicePath}/src/jobStore.js`);
    const geminiClient = {
      startReport: vi.fn().mockResolvedValue({ id: "interaction-1", status: "in_progress" }),
      getReport: vi.fn().mockRejectedValue(new Error("Gemini Deep Research request failed")),
    };
    const store = new DeepIntelligenceJobStore({
      geminiClient,
      maxActiveJobs: 2,
      retentionMs: 86_400_000,
      jobTimeoutMs: 3_600_000,
      monthlyBudgetUsd: 10_000,
      estimatedJobCostUsd: 7,
    });

    const created = await store.createReport({
      subject: {
        name: "Ada Lovelace",
        location: { city: "London", country: "United Kingdom" },
      },
      consent: { accepted: true, purpose: "self_audit" },
    });
    const failed = await store.getReport(created.jobId);

    expect(failed).toMatchObject({
      success: false,
      status: "failed",
      error: { message: "Gemini Deep Research request failed" },
    });
  });
});

describe("deep intelligence Express API", () => {
  it("protects report routes and returns health without secrets", async () => {
    const { createApp } = await importFresh(`${servicePath}/src/app.js`);
    const geminiClient = {
      startReport: vi.fn().mockResolvedValue({ id: "interaction-1", status: "in_progress" }),
      getReport: vi.fn(),
    };
    const app = createApp({
      config: {
        serviceName: "hushh-deep-intelligence-api",
        geminiApiKey: "gemini-key",
        internalApiKey: "internal-key",
        model: "deep-research-preview-04-2026",
        maxActiveJobs: 2,
        retentionMs: 86_400_000,
        retentionHours: 24,
        rateLimitWindowMs: 60_000,
        rateLimitMax: 10,
        jobTimeoutMs: 3_600_000,
        enableTestUi: false,
        mockResearch: false,
        monthlyBudgetUsd: 10_000,
        estimatedJobCostUsd: 7,
      },
      geminiClient,
    });

    const server = app.listen(0);
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;

    try {
      const health = await fetch(`${baseUrl}/health`);
      const healthBody = await health.json();
      expect(health.status).toBe(200);
      expect(healthBody).toMatchObject({
        status: "ok",
        service: "hushh-deep-intelligence-api",
        model: "deep-research-preview-04-2026",
        authConfigured: true,
      });
      expect(JSON.stringify(healthBody)).not.toContain("internal-key");
      expect(JSON.stringify(healthBody)).not.toContain("gemini-key");

      const unauthorized = await fetch(`${baseUrl}/v1/intelligence/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(unauthorized.status).toBe(401);

      const started = await fetch(`${baseUrl}/v1/intelligence/reports`, {
        method: "POST",
        headers: {
          Authorization: "Bearer internal-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: {
            name: "Ada Lovelace",
            location: { city: "London", country: "United Kingdom" },
          },
          consent: { accepted: true, purpose: "self_audit" },
        }),
      });
      const startedBody = await started.json();

      expect(started.status).toBe(202);
      expect(startedBody).toMatchObject({ success: true, status: "in_progress" });
      expect(startedBody.jobId).toEqual(expect.any(String));
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it("serves the lab UI only when explicitly enabled and starts reports from browser location", async () => {
    const { createApp } = await importFresh(`${servicePath}/src/app.js`);
    const geminiClient = {
      startReport: vi.fn().mockResolvedValue({ id: "interaction-1", status: "in_progress" }),
      getReport: vi.fn().mockResolvedValue({
        id: "interaction-1",
        status: "completed",
        outputs: [
          {
            type: "text",
            text: "Public profile: https://github.com/ada",
            annotations: [{ source: "https://github.com/ada" }],
          },
        ],
      }),
    };
    const config = {
      serviceName: "hushh-deep-intelligence-api",
      geminiApiKey: "gemini-key",
      internalApiKey: "internal-key",
      model: "deep-research-preview-04-2026",
      maxActiveJobs: 2,
      retentionMs: 86_400_000,
      retentionHours: 24,
      rateLimitWindowMs: 60_000,
      rateLimitMax: 10,
      jobTimeoutMs: 3_600_000,
      enableTestUi: true,
      mockResearch: false,
      monthlyBudgetUsd: 10_000,
      estimatedJobCostUsd: 7,
    };
    const app = createApp({ config, geminiClient });
    const originalFetch = globalThis.fetch;
    const reverseFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        address: {
          city: "London",
          state: "England",
          country: "United Kingdom",
        },
      }),
    });
    globalThis.fetch = reverseFetch as unknown as typeof fetch;

    const server = app.listen(0);
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;

    try {
      const labPage = await originalFetch(`${baseUrl}/lab`);
      const labHtml = await labPage.text();
      expect(labPage.status).toBe(200);
      expect(labHtml).toContain("Deep Intelligence Lab");
      expect(labHtml).toContain("Use Location & Run");
      expect(labHtml).toContain("navigator.geolocation.getCurrentPosition");
      expect(labHtml).toContain("using approximate location");

      const started = await originalFetch(`${baseUrl}/lab/intelligence/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Ada Lovelace",
          browserLocation: { latitude: 51.5, longitude: -0.12 },
          browserContext: { timezone: "Europe/London", locale: "en-GB" },
        }),
      });
      const startedBody = await started.json();

      expect(started.status).toBe(202);
      expect(startedBody).toMatchObject({
        status: "in_progress",
        coarseLocation: {
          city: "London",
          region: "England",
          country: "United Kingdom",
        },
      });
      expect(geminiClient.startReport).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.objectContaining({
            name: "Ada Lovelace",
            location: {
              city: "London",
              region: "England",
              country: "United Kingdom",
            },
          }),
        }),
      );

      const completed = await originalFetch(
        `${baseUrl}/lab/intelligence/reports/${startedBody.jobId}`,
      );
      const completedBody = await completed.json();
      expect(completedBody).toMatchObject({
        success: true,
        status: "completed",
        report: {
          publicProfiles: [{ platform: "github", url: "https://github.com/ada" }],
        },
      });
    } finally {
      globalThis.fetch = originalFetch;
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it("keeps the browser lab disabled by default", async () => {
    const { createApp } = await importFresh(`${servicePath}/src/app.js`);
    const app = createApp({
      config: {
        serviceName: "hushh-deep-intelligence-api",
        geminiApiKey: "gemini-key",
        internalApiKey: "internal-key",
        model: "deep-research-preview-04-2026",
        maxActiveJobs: 2,
        retentionMs: 86_400_000,
        retentionHours: 24,
        rateLimitWindowMs: 60_000,
        rateLimitMax: 10,
        jobTimeoutMs: 3_600_000,
        enableTestUi: false,
        mockResearch: false,
        monthlyBudgetUsd: 10_000,
        estimatedJobCostUsd: 7,
      },
      geminiClient: {
        startReport: vi.fn(),
        getReport: vi.fn(),
      },
    });

    const server = app.listen(0);
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;

    try {
      const response = await fetch(`${baseUrl}/lab`);
      expect(response.status).toBe(404);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it("supports explicit mock research mode for standalone lab smoke tests", async () => {
    const { createApp } = await importFresh(`${servicePath}/src/app.js`);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        address: {
          city: "Pune",
          state: "Maharashtra",
          country: "India",
        },
      }),
    }) as unknown as typeof fetch;

    const app = createApp({
      config: {
        serviceName: "hushh-deep-intelligence-api",
        geminiApiKey: "",
        internalApiKey: "internal-key",
        model: "deep-research-preview-04-2026",
        maxActiveJobs: 2,
        retentionMs: 86_400_000,
        retentionHours: 24,
        rateLimitWindowMs: 60_000,
        rateLimitMax: 10,
        jobTimeoutMs: 3_600_000,
        enableTestUi: true,
        mockResearch: true,
        monthlyBudgetUsd: 10_000,
        estimatedJobCostUsd: 7,
      },
    });

    const server = app.listen(0);
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;

    try {
      const started = await originalFetch(`${baseUrl}/lab/intelligence/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Ankit Singh",
          browserLocation: { latitude: 18.52, longitude: 73.85 },
          browserContext: { timezone: "Asia/Kolkata", locale: "en-IN" },
        }),
      });
      const startedBody = await started.json();
      expect(started.status).toBe(202);
      expect(startedBody.status).toBe("in_progress");

      const firstPoll = await originalFetch(
        `${baseUrl}/lab/intelligence/reports/${startedBody.jobId}`,
      );
      expect((await firstPoll.json()).status).toBe("in_progress");

      const secondPoll = await originalFetch(
        `${baseUrl}/lab/intelligence/reports/${startedBody.jobId}`,
      );
      const secondBody = await secondPoll.json();
      expect(secondBody).toMatchObject({
        success: true,
        status: "completed",
        report: {
          confidence: "low",
        },
      });
      expect(secondBody.report.summary).toContain("Mock safe summary for Ankit Singh");
    } finally {
      globalThis.fetch = originalFetch;
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it("continues the lab flow with coarse request location when browser permission is blocked", async () => {
    const { createApp } = await importFresh(`${servicePath}/src/app.js`);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        city: "Seattle",
        region: "Washington",
        country_name: "United States",
      }),
    }) as unknown as typeof fetch;

    const app = createApp({
      config: {
        serviceName: "hushh-deep-intelligence-api",
        geminiApiKey: "",
        internalApiKey: "internal-key",
        model: "deep-research-preview-04-2026",
        maxActiveJobs: 2,
        retentionMs: 86_400_000,
        retentionHours: 24,
        rateLimitWindowMs: 60_000,
        rateLimitMax: 10,
        jobTimeoutMs: 3_600_000,
        enableTestUi: true,
        mockResearch: true,
        monthlyBudgetUsd: 10_000,
        estimatedJobCostUsd: 7,
      },
    });

    const server = app.listen(0);
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;

    try {
      const started = await originalFetch(`${baseUrl}/lab/intelligence/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "8.8.8.8",
        },
        body: JSON.stringify({
          name: "Blocked Browser User",
          browserLocation: null,
          browserContext: {
            timezone: "America/Los_Angeles",
            locale: "en-US",
            locationWarning: "Location permission was denied; using approximate location.",
          },
        }),
      });
      const startedBody = await started.json();
      expect(started.status).toBe(202);
      expect(startedBody).toMatchObject({
        status: "in_progress",
        coarseLocation: {
          city: "Seattle",
          region: "Washington",
          country: "United States",
        },
      });
    } finally {
      globalThis.fetch = originalFetch;
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it("blocks new jobs after the estimated monthly budget is exhausted", async () => {
    const { DeepIntelligenceJobStore } = await importFresh(`${servicePath}/src/jobStore.js`);
    const geminiClient = {
      startReport: vi.fn().mockResolvedValue({ id: "interaction-1", status: "in_progress" }),
      getReport: vi.fn(),
    };
    const store = new DeepIntelligenceJobStore({
      geminiClient,
      maxActiveJobs: 5,
      retentionMs: 86_400_000,
      jobTimeoutMs: 3_600_000,
      monthlyBudgetUsd: 10,
      estimatedJobCostUsd: 7,
    });

    await store.createReport({
      subject: {
        name: "Ada Lovelace",
        location: { city: "London", country: "United Kingdom" },
      },
      consent: { accepted: true, purpose: "self_audit" },
    });

    await expect(
      store.createReport({
        subject: {
          name: "Grace Hopper",
          location: { city: "Arlington", region: "Virginia", country: "United States" },
        },
        consent: { accepted: true, purpose: "self_audit" },
      }),
    ).rejects.toThrow(/budget/);
    expect(geminiClient.startReport).toHaveBeenCalledTimes(1);
  });
});
