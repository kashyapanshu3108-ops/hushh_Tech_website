import { randomUUID } from "node:crypto";

import { HttpError } from "./errors.js";
import { sanitizeInteractionReport } from "./sanitizer.js";
import { validateReportRequest } from "./validation.js";

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

function publicJob(job) {
  const base = {
    success: job.status !== "failed" && job.status !== "cancelled",
    jobId: job.id,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };

  if (job.status === "completed") {
    return { ...base, report: job.report };
  }

  if (job.status === "failed" || job.status === "cancelled") {
    return { ...base, error: job.error || { message: "Research job did not complete" } };
  }

  return base;
}

export class DeepIntelligenceJobStore {
  constructor({
    geminiClient,
    maxActiveJobs,
    retentionMs,
    jobTimeoutMs,
    monthlyBudgetUsd,
    estimatedJobCostUsd,
    now = () => Date.now(),
  }) {
    this.geminiClient = geminiClient;
    this.maxActiveJobs = maxActiveJobs;
    this.retentionMs = retentionMs;
    this.jobTimeoutMs = jobTimeoutMs;
    this.monthlyBudgetUsd = monthlyBudgetUsd;
    this.estimatedJobCostUsd = estimatedJobCostUsd;
    this.now = now;
    this.jobs = new Map();
    this.monthlyBudgetReservations = new Map();
  }

  currentBudgetMonth() {
    return new Date(this.now()).toISOString().slice(0, 7);
  }

  reserveEstimatedBudget() {
    const month = this.currentBudgetMonth();
    const used = this.monthlyBudgetReservations.get(month) || 0;
    const nextUsed = Number((used + this.estimatedJobCostUsd).toFixed(2));

    if (nextUsed > this.monthlyBudgetUsd) {
      throw new HttpError(429, "Monthly estimated Gemini budget limit reached", "monthly_budget_reached");
    }

    this.monthlyBudgetReservations.set(month, nextUsed);
  }

  pruneExpiredJobs() {
    const cutoff = this.now() - this.retentionMs;
    for (const [id, job] of this.jobs.entries()) {
      if (Date.parse(job.updatedAt) < cutoff) {
        this.jobs.delete(id);
      }
    }
  }

  activeJobCount() {
    return Array.from(this.jobs.values()).filter((job) => !TERMINAL_STATUSES.has(job.status)).length;
  }

  async createReport(rawBody, requestContext = {}) {
    this.pruneExpiredJobs();

    if (this.activeJobCount() >= this.maxActiveJobs) {
      throw new HttpError(429, "Too many active deep intelligence jobs", "too_many_active_jobs");
    }

    const payload = validateReportRequest(rawBody);
    this.reserveEstimatedBudget();
    const interaction = await this.geminiClient.startReport(payload);
    const timestamp = new Date(this.now()).toISOString();
    const job = {
      id: randomUUID(),
      status: interaction.status || "in_progress",
      geminiInteractionId: interaction.id,
      subject: payload.subject,
      consent: payload.consent,
      createdAt: timestamp,
      updatedAt: timestamp,
      requestContext: {
        requestId: requestContext.requestId,
        ipHash: requestContext.ipHash,
      },
    };

    if (job.status === "completed") {
      job.report = sanitizeInteractionReport(interaction);
    } else if (job.status === "failed" || job.status === "cancelled") {
      job.error = {
        message: interaction.error?.message || `Gemini Deep Research ${job.status}`,
      };
    }

    this.jobs.set(job.id, job);
    return publicJob(job);
  }

  async getReport(jobId) {
    this.pruneExpiredJobs();
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new HttpError(404, "Report job not found", "job_not_found");
    }

    if (TERMINAL_STATUSES.has(job.status)) {
      return publicJob(job);
    }

    if (this.now() - Date.parse(job.createdAt) > this.jobTimeoutMs) {
      job.status = "failed";
      job.updatedAt = new Date(this.now()).toISOString();
      job.error = { message: "Research job timed out before completion" };
      return publicJob(job);
    }

    let interaction;
    try {
      interaction = await this.geminiClient.getReport(job.geminiInteractionId);
    } catch (error) {
      job.status = "failed";
      job.updatedAt = new Date(this.now()).toISOString();
      job.error = {
        message: error?.message || "Failed to poll Gemini Deep Research",
      };
      return publicJob(job);
    }

    job.status = interaction.status || job.status;
    job.updatedAt = new Date(this.now()).toISOString();

    if (job.status === "completed") {
      job.report = sanitizeInteractionReport(interaction);
    } else if (job.status === "failed" || job.status === "cancelled") {
      job.error = {
        message: interaction.error?.message || `Gemini Deep Research ${job.status}`,
      };
    }

    return publicJob(job);
  }
}
