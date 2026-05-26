import { UpstreamError } from "./errors.js";
import { buildDeepResearchPrompt } from "./prompt.js";

const INTERACTIONS_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const DEEP_RESEARCH_API_REVISION = "2026-05-20";

export class GeminiDeepResearchClient {
  constructor({
    apiKey,
    model,
    fetchImpl = globalThis.fetch,
    endpoint = INTERACTIONS_ENDPOINT,
    apiRevision = DEEP_RESEARCH_API_REVISION,
  } = {}) {
    if (!apiKey) {
      throw new UpstreamError("GEMINI_API_KEY is not configured");
    }
    if (typeof fetchImpl !== "function") {
      throw new UpstreamError("fetch is not available for Gemini Deep Research");
    }

    this.apiKey = apiKey;
    this.model = model || "deep-research-preview-04-2026";
    this.fetchImpl = fetchImpl;
    this.endpoint = endpoint;
    this.apiRevision = apiRevision;
  }

  async startReport(payload) {
    let interaction;
    try {
      interaction = await this.requestJson("", {
        method: "POST",
        body: {
          input: buildDeepResearchPrompt(payload),
          agent: this.model,
          background: true,
          store: true,
          agent_config: {
            type: "deep-research",
            thinking_summaries: "auto",
            visualization: "off",
            collaborative_planning: false,
          },
          tools: [{ type: "google_search" }, { type: "url_context" }, { type: "code_execution" }],
        },
      });
    } catch (error) {
      throw normalizeGeminiError(error);
    }

    if (!interaction?.id) {
      throw new UpstreamError("Gemini did not return an interaction id");
    }

    return interaction;
  }

  async getReport(interactionId) {
    if (!interactionId) {
      throw new UpstreamError("Missing Gemini interaction id");
    }
    try {
      return await this.requestJson(`/${encodeURIComponent(interactionId)}`);
    } catch (error) {
      throw normalizeGeminiError(error);
    }
  }

  async requestJson(path, { method = "GET", body } = {}) {
    const response = await this.fetchImpl(`${this.endpoint}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Api-Revision": this.apiRevision,
        "x-goog-api-key": this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await parseJsonResponse(response);
    if (!response.ok) {
      throw {
        status: response.status,
        error: json,
      };
    }

    return json;
  }
}

async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function normalizeGeminiError(error) {
  if (error instanceof UpstreamError) {
    return error;
  }

  const code = error?.error?.error?.code || error?.error?.code || error?.code;
  const message = error?.error?.error?.message || error?.error?.message || error?.message || "";
  const status = error?.status || error?.statusCode;
  const detail = formatSafeGeminiDetail({ status, code, message });

  if (status === 403 || /permission_denied/i.test(String(code)) || /denied access/i.test(message)) {
    return new UpstreamError(
      "Gemini API project is denied access to Deep Research/Interactions. Enable preview access or use a Gemini API key from an allowed project.",
    );
  }

  return new UpstreamError(
    detail ? `Gemini Deep Research request failed: ${detail}` : "Gemini Deep Research request failed",
  );
}

function formatSafeGeminiDetail({ status, code, message }) {
  const parts = [];
  if (status) parts.push(`status ${status}`);
  if (code) parts.push(`code ${String(code).slice(0, 80)}`);

  const safeMessage = redactSecretLikeText(message).replace(/\s+/g, " ").trim();
  if (safeMessage) parts.push(safeMessage.slice(0, 500));

  return parts.join("; ");
}

function redactSecretLikeText(value) {
  return String(value || "")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted-api-key]")
    .replace(/([?&](?:key|api_key|access_token|token)=)[^&\s]+/gi, "$1[redacted]")
    .replace(/(x-goog-api-key['":\s]+)[0-9A-Za-z_-]{20,}/gi, "$1[redacted]");
}
