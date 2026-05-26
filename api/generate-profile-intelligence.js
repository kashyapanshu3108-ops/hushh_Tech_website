/**
 * Server-side Profile Intelligence wrapper for the Cloud Run web runtime.
 * Validates the Supabase session, calls the RIA Intelligence OSINT profile API,
 * and returns the formatted profile display model.
 */

import { formatProfileIntelligenceReport } from "./shared/profileIntelligenceFormatter.js";
import { createSupabaseServerClient } from "./shared/supabaseServerClient.js";

const DEFAULT_PROFILE_INTELLIGENCE_API_BASE_URL =
  "https://hushh-ria-intelligence-api-53407187172.us-central1.run.app";
const DEFAULT_PROFILE_INTELLIGENCE_TIMEOUT_MS = 180000;
const USER_SAFE_UPSTREAM_ERROR =
  "Profile intelligence is temporarily unavailable. Please try again shortly.";

function trimValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseInteger(value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function getBearerToken(req) {
  const raw = trimValue(req.headers?.authorization || req.headers?.Authorization);
  return raw.startsWith("Bearer ") ? raw.slice("Bearer ".length).trim() : "";
}

function getSupabaseConfig(env = process.env) {
  const supabaseUrl = trimValue(env.SUPABASE_URL) || trimValue(env.VITE_SUPABASE_URL);
  const serviceRoleKey = trimValue(env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseUrl || !serviceRoleKey) {
    const error = new Error("Profile authentication is not configured on server");
    error.statusCode = 503;
    throw error;
  }

  return { supabaseUrl, serviceRoleKey };
}

async function authenticateRequest(req, env = process.env) {
  const token = getBearerToken(req);
  if (!token) {
    const error = new Error("Missing authorization header");
    error.statusCode = 401;
    throw error;
  }

  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig(env);
  const client = createSupabaseServerClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await client.auth.getUser(token);

  if (error || !data?.user) {
    const authError = new Error("Unauthorized - invalid token");
    authError.statusCode = 401;
    throw authError;
  }

  return data.user;
}

function normalizeBaseUrl(env = process.env) {
  return (
    trimValue(env.PROFILE_INTELLIGENCE_API_BASE_URL) || DEFAULT_PROFILE_INTELLIGENCE_API_BASE_URL
  ).replace(/\/+$/, "");
}

function parseTimeoutMs(env = process.env) {
  return parseInteger(
    env.PROFILE_INTELLIGENCE_TIMEOUT_MS,
    DEFAULT_PROFILE_INTELLIGENCE_TIMEOUT_MS,
    { min: 5000, max: 15 * 60 * 1000 },
  );
}

function normalizeInput(body = {}) {
  const raw = body.input && typeof body.input === "object" ? body.input : body;
  return {
    name: trimValue(raw.name),
    email: trimValue(raw.email).toLowerCase(),
    zipCode: trimValue(raw.zipCode || raw.zip_code || raw.postalCode),
  };
}

function validateInput(input) {
  const missing = [];
  if (!input.name) missing.push("name");
  if (!input.email) missing.push("email");
  if (!input.zipCode) missing.push("zipCode");

  if (missing.length > 0) {
    return `Missing required fields: ${missing.join(", ")}`;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    return "Invalid email";
  }

  return "";
}

async function readJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await readJsonResponse(response);

  if (!response.ok) {
    const error = new Error(USER_SAFE_UPSTREAM_ERROR);
    error.statusCode = 502;
    error.upstreamStatus = response.status;
    error.upstreamCode = payload?.error?.code;
    error.upstreamMessage = payload?.error?.message;
    throw error;
  }

  return payload;
}

async function fetchProfileIntelligence(input, env = process.env) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), parseTimeoutMs(env));
  const baseUrl = normalizeBaseUrl(env);
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  try {
    return await fetchJson(`${baseUrl}/v1/intelligence/osint-profile`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: input.name,
        email: input.email,
        zipCode: input.zipCode,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error(USER_SAFE_UPSTREAM_ERROR);
      timeoutError.statusCode = 504;
      timeoutError.cause = error;
      throw timeoutError;
    }

    if (error?.statusCode) {
      throw error;
    }

    const upstreamError = new Error(USER_SAFE_UPSTREAM_ERROR);
    upstreamError.statusCode = 502;
    upstreamError.cause = error;
    throw upstreamError;
  } finally {
    clearTimeout(timeout);
  }
}

function sendCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
  );
}

export default async function handler(req, res) {
  sendCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    await authenticateRequest(req);

    const input = normalizeInput(req.body || {});
    const inputError = validateInput(input);
    if (inputError) {
      return res.status(400).json({ error: inputError });
    }

    const payload = await fetchProfileIntelligence(input);
    const formatted = formatProfileIntelligenceReport(payload, {
      model: payload?.model || process.env.PROFILE_INTELLIGENCE_MODEL,
    });
    const profileIntelligence = formatted.intelligence;

    return res.status(200).json({
      success: true,
      intelligence: profileIntelligence,
      shadow_profile: {
        profileIntelligence,
        confidence: formatted.confidence,
      },
    });
  } catch (error) {
    const status = error?.statusCode || 500;
    const message =
      status === 502 || status === 504
        ? USER_SAFE_UPSTREAM_ERROR
        : error?.message || "Failed to generate profile intelligence";

    console.error("Error generating profile intelligence:", {
      status,
      message,
      upstreamStatus: error?.upstreamStatus,
      upstreamCode: error?.upstreamCode,
    });

    return res.status(status).json({ error: message });
  }
}
