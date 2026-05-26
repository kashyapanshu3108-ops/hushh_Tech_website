import { createHash, randomUUID } from "node:crypto";

import { AuthError, HttpError } from "./errors.js";

function bearerToken(req) {
  const header = req.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
}

export function requestIdMiddleware(req, res, next) {
  req.requestId = req.get("x-request-id") || randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
}

export function requireInternalAuth(config) {
  return (req, _res, next) => {
    if (!config.internalApiKey) {
      return next(new HttpError(503, "DEEP_INTELLIGENCE_API_KEY is not configured", "auth_not_configured"));
    }

    const token = bearerToken(req) || req.get("x-api-key") || "";
    if (token !== config.internalApiKey) {
      return next(new AuthError());
    }

    return next();
  };
}

export function createRateLimiter({ windowMs, max }) {
  const buckets = new Map();

  return (req, _res, next) => {
    const key = `${req.ip}:${bearerToken(req) || req.get("x-api-key") || "anonymous"}`;
    const now = Date.now();
    const bucket = buckets.get(key) || { resetAt: now + windowMs, count: 0 };

    if (now > bucket.resetAt) {
      bucket.resetAt = now + windowMs;
      bucket.count = 0;
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > max) {
      return next(new HttpError(429, "Rate limit exceeded", "rate_limit_exceeded"));
    }

    return next();
  };
}

export function requestContext(req) {
  const ipHash = createHash("sha256")
    .update(`${req.ip || "unknown"}:${req.get("user-agent") || ""}`)
    .digest("hex")
    .slice(0, 16);

  return {
    requestId: req.requestId,
    ipHash,
  };
}

export function errorMiddleware(err, _req, res, _next) {
  const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
  const code = err?.code || "internal_error";
  const message = statusCode >= 500 && code === "internal_error" ? "Internal server error" : err.message;

  if (statusCode >= 500) {
    console.error("Deep intelligence API error:", err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
}
