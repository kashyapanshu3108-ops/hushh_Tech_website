import express from "express";

import { getConfig } from "./config.js";
import { GeminiDeepResearchClient } from "./geminiClient.js";
import { DeepIntelligenceJobStore } from "./jobStore.js";
import { renderLabPage } from "./labPage.js";
import { coarsenLabLocation } from "./location.js";
import { MockDeepResearchClient } from "./mockGeminiClient.js";
import {
  createRateLimiter,
  errorMiddleware,
  requestContext,
  requestIdMiddleware,
  requireInternalAuth,
} from "./middleware.js";

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function createApp({ config = getConfig(), geminiClient, jobStore } = {}) {
  const app = express();
  const client =
    geminiClient ||
    (config.mockResearch
      ? new MockDeepResearchClient()
      : new GeminiDeepResearchClient({
          apiKey: config.geminiApiKey,
          model: config.model,
        }));
  const store =
    jobStore ||
    new DeepIntelligenceJobStore({
      geminiClient: client,
      maxActiveJobs: config.maxActiveJobs,
      retentionMs: config.retentionMs,
      jobTimeoutMs: config.jobTimeoutMs,
      monthlyBudgetUsd: config.monthlyBudgetUsd,
      estimatedJobCostUsd: config.estimatedJobCostUsd,
    });
  const rateLimiter = createRateLimiter({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
  });

  app.disable("x-powered-by");
  app.use(express.json({ limit: "256kb" }));
  app.use(requestIdMiddleware);

  app.get("/", (_req, res) => {
    res.json({
      service: config.serviceName,
      status: "ok",
    });
  });

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: config.serviceName,
      model: config.model,
      authConfigured: Boolean(config.internalApiKey),
      maxActiveJobs: config.maxActiveJobs,
      retentionHours: config.retentionHours,
      testUiEnabled: config.enableTestUi,
      mockResearch: config.mockResearch,
      monthlyBudgetUsd: config.monthlyBudgetUsd,
      estimatedJobCostUsd: config.estimatedJobCostUsd,
    });
  });

  if (config.enableTestUi) {
    app.get("/lab", (_req, res) => {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(renderLabPage());
    });

    app.post(
      "/lab/intelligence/reports",
      rateLimiter,
      asyncHandler(async (req, res) => {
        const location = await coarsenLabLocation({
          browserLocation: req.body?.browserLocation,
          browserContext: req.body?.browserContext,
          req,
        });
        const job = await store.createReport(
          {
            subject: {
              name: req.body?.name,
              location,
            },
            consent: {
              accepted: true,
              purpose: "self_audit",
            },
          },
          requestContext(req),
        );
        res.status(202).json({ ...job, coarseLocation: location });
      }),
    );

    app.get(
      "/lab/intelligence/reports/:jobId",
      rateLimiter,
      asyncHandler(async (req, res) => {
        const job = await store.getReport(req.params.jobId);
        res.json(job);
      }),
    );
  }

  app.use("/v1", requireInternalAuth(config), rateLimiter);

  app.post(
    "/v1/intelligence/reports",
    asyncHandler(async (req, res) => {
      const job = await store.createReport(req.body, requestContext(req));
      res.status(202).json(job);
    }),
  );

  app.get(
    "/v1/intelligence/reports/:jobId",
    asyncHandler(async (req, res) => {
      const job = await store.getReport(req.params.jobId);
      res.json(job);
    }),
  );

  app.use(errorMiddleware);

  return app;
}
