const URL_PATTERN = /\bhttps?:\/\/[^\s<>"')\]]+/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN =
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/g;
const ADDRESS_PATTERN =
  /\b\d{1,6}\s+[\w.'-]+(?:\s+[\w.'-]+){0,5}\s+(street|st|road|rd|avenue|ave|lane|ln|drive|dr|boulevard|blvd|apartment|apt|suite|unit|flat)\b/gi;
const SECRET_PATTERN =
  /\b(?:api[_-]?key|secret[_-]?key|private[_-]?key|access[_-]?token|bearer\s+token|password)\s*[:=]\s*['"]?[A-Za-z0-9._~+/=-]{8,}/gi;
const GOV_ID_PATTERN =
  /\b(?:\d{3}-\d{2}-\d{4}|\d{4}\s\d{4}\s\d{4}|\d{13,19})\b/g;

function toText(value) {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return JSON.stringify(value, null, 2);
}

function replaceAndTrack(text, pattern, replacement, redactions, label) {
  return text.replace(pattern, () => {
    redactions.add(label);
    return replacement;
  });
}

export function redactSensitiveText(value) {
  const redactions = new Set();
  let text = toText(value);

  text = replaceAndTrack(text, SECRET_PATTERN, "[redacted-secret]", redactions, "secret");
  text = replaceAndTrack(text, EMAIL_PATTERN, "[redacted-email]", redactions, "email");
  text = replaceAndTrack(text, PHONE_PATTERN, "[redacted-phone]", redactions, "phone");
  text = replaceAndTrack(text, ADDRESS_PATTERN, "[redacted-address]", redactions, "address");
  text = replaceAndTrack(text, GOV_ID_PATTERN, "[redacted-id]", redactions, "government_or_financial_id");

  return { text, redactions: Array.from(redactions).sort() };
}

function safeUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function platformFromUrl(url) {
  const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  if (host.includes("linkedin.com")) return "linkedin";
  if (host === "x.com" || host.includes("twitter.com")) return "x";
  if (host.includes("github.com")) return "github";
  if (host.includes("medium.com")) return "medium";
  if (host.includes("youtube.com")) return "youtube";
  return "website";
}

function extractUrls(text) {
  const urls = new Set();
  for (const match of text.matchAll(URL_PATTERN)) {
    const cleaned = safeUrl(match[0].replace(/[.,;:!?]+$/g, ""));
    if (cleaned) urls.add(cleaned);
  }
  return Array.from(urls);
}

function extractAnnotationSources(outputs = []) {
  const sources = [];
  for (const output of outputs) {
    const annotations = Array.isArray(output?.annotations) ? output.annotations : [];
    for (const annotation of annotations) {
      const source = typeof annotation?.source === "string" ? annotation.source.trim() : "";
      if (!source) continue;
      const url = safeUrl(source);
      sources.push(url ? { uri: url } : { title: source });
    }
  }
  return sources;
}

function uniqueByUriOrTitle(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.uri || item.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function extractInteractionText(interaction = {}) {
  if (typeof interaction.output_text === "string") return interaction.output_text;
  if (typeof interaction.outputText === "string") return interaction.outputText;

  const outputs = Array.isArray(interaction.outputs) ? interaction.outputs : [];
  return outputs
    .map((output) => {
      if (typeof output?.text === "string") return output.text;
      if (typeof output?.content === "string") return output.content;
      if (Array.isArray(output?.content)) {
        return output.content.map((item) => item?.text || "").join("\n");
      }
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

export function sanitizeInteractionReport(interaction = {}) {
  const rawText = extractInteractionText(interaction);
  const { text, redactions } = redactSensitiveText(rawText);
  const urls = extractUrls(text);
  const annotationSources = extractAnnotationSources(interaction.outputs);

  const sourceCitations = uniqueByUriOrTitle([
    ...annotationSources,
    ...urls.map((uri) => ({ uri })),
  ]).slice(0, 25);

  const publicProfiles = urls
    .filter((uri) =>
      /linkedin\.com|github\.com|x\.com|twitter\.com|medium\.com|youtube\.com/i.test(uri),
    )
    .map((uri) => ({ platform: platformFromUrl(uri), url: uri }))
    .filter((profile, index, all) => all.findIndex((item) => item.url === profile.url) === index)
    .slice(0, 10);

  const riskFlags = [];
  if (redactions.length > 0) riskFlags.push("sensitive_content_redacted");
  if (sourceCitations.length === 0) riskFlags.push("source_coverage_low");
  if (/\b(ambiguous|not confirm|cannot confirm|uncertain|insufficient)\b/i.test(text)) {
    riskFlags.push("identity_match_ambiguous");
  }

  const confidence =
    sourceCitations.length >= 5 && !riskFlags.includes("identity_match_ambiguous")
      ? "high"
      : sourceCitations.length >= 2
        ? "medium"
        : "low";

  const warnings = [
    "Report is limited to public web signals available to Gemini Deep Research.",
    "Do not use this report for credit, employment, housing, insurance, or legal eligibility decisions.",
  ];
  if (!rawText) warnings.unshift("Gemini returned no final report text.");

  return {
    summary: text.trim(),
    publicProfiles,
    sourceCitations,
    confidence,
    riskFlags,
    redactions,
    warnings,
  };
}
