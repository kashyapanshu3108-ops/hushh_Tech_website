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

const PROFILE_DOMAINS = [
  "linkedin.com",
  "github.com",
  "x.com",
  "twitter.com",
  "medium.com",
  "youtube.com",
  "crunchbase.com",
];

function trimValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) return [value];
  return [];
}

function uniqueStrings(values) {
  return Array.from(
    new Set(
      values
        .map((value) => trimValue(value))
        .filter(Boolean),
    ),
  );
}

function replaceAndTrack(text, pattern, replacement, redactions, label) {
  return text.replace(pattern, () => {
    redactions.add(label);
    return replacement;
  });
}

export function redactSensitiveText(value) {
  const redactions = new Set();
  let text = typeof value === "string" ? value : JSON.stringify(value ?? "", null, 2);

  text = replaceAndTrack(text, SECRET_PATTERN, "[redacted-secret]", redactions, "secret");
  text = replaceAndTrack(text, EMAIL_PATTERN, "[redacted-email]", redactions, "email");
  text = replaceAndTrack(text, PHONE_PATTERN, "[redacted-phone]", redactions, "phone");
  text = replaceAndTrack(text, ADDRESS_PATTERN, "[redacted-address]", redactions, "address");
  text = replaceAndTrack(text, GOV_ID_PATTERN, "[redacted-id]", redactions, "government_or_financial_id");

  return { text: text.trim(), redactions: Array.from(redactions).sort() };
}

function safeUrl(rawUrl) {
  try {
    const url = new URL(trimValue(rawUrl));
    if (!["http:", "https:"].includes(url.protocol)) return "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function domainFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function platformFromUrl(url) {
  const host = domainFromUrl(url).toLowerCase();
  if (host.includes("linkedin.com")) return "LinkedIn";
  if (host.includes("github.com")) return "GitHub";
  if (host === "x.com" || host.includes("twitter.com")) return "X";
  if (host.includes("medium.com")) return "Medium";
  if (host.includes("youtube.com")) return "YouTube";
  if (host.includes("crunchbase.com")) return "Crunchbase";
  return "Website";
}

function sourceUrlFromValue(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  return trimValue(value.url || value.uri || value.link || value.href || value.source);
}

function titleFromValue(value, fallbackUrl) {
  if (value && typeof value === "object") {
    const title = trimValue(value.title || value.name || value.label || value.source);
    if (title) return title;
  }
  return domainFromUrl(fallbackUrl) || "Public source";
}

function supportsFromSource(source, url) {
  const text = `${titleFromValue(source, url)} ${domainFromUrl(url)}`.toLowerCase();
  if (/linkedin|profile|bio|about/.test(text)) return "Professional profile";
  if (/github|repository|repo|commit/.test(text)) return "Technical footprint";
  if (/company|team|founder|leadership|startup/.test(text)) return "Company affiliation";
  if (/news|press|article|publication|blog|medium/.test(text)) return "Publication or media";
  if (/youtube|talk|podcast|event|conference/.test(text)) return "Public talk or media";
  return "Public web signal";
}

function normalizeEvidence(...sourceGroups) {
  const seen = new Set();
  const evidence = [];

  for (const group of sourceGroups) {
    for (const source of toList(group)) {
      const url = safeUrl(sourceUrlFromValue(source));
      if (!url || seen.has(url)) continue;
      seen.add(url);
      evidence.push({
        title: titleFromValue(source, url),
        domain: domainFromUrl(url),
        url,
        supports:
          source && typeof source === "object" && trimValue(source.supports)
            ? trimValue(source.supports)
            : supportsFromSource(source, url),
      });
    }
  }

  return evidence.slice(0, 12);
}

function extractUrls(text) {
  const urls = [];
  for (const match of String(text || "").matchAll(URL_PATTERN)) {
    const url = safeUrl(match[0].replace(/[.,;:!?]+$/g, ""));
    if (url) urls.push({ url, title: domainFromUrl(url) });
  }
  return urls;
}

function normalizePublicProfiles(rawProfiles, evidence, confidenceLabel) {
  const candidates = [
    ...toList(rawProfiles).map((profile) => {
      const url = safeUrl(sourceUrlFromValue(profile));
      if (!url) return null;
      const confidence = trimValue(profile?.confidence).toLowerCase();
      return {
        platform: trimValue(profile?.platform) || platformFromUrl(url),
        title: trimValue(profile?.title) || titleFromValue(profile, url),
        url,
        confidence: ["high", "medium", "low"].includes(confidence)
          ? confidence
          : confidenceLabel.toLowerCase(),
      };
    }),
    ...evidence
      .filter((item) => PROFILE_DOMAINS.some((domain) => item.domain.includes(domain)))
      .map((item) => ({
        platform: platformFromUrl(item.url),
        title: item.title,
        url: item.url,
        confidence: confidenceLabel.toLowerCase(),
      })),
  ].filter(Boolean);

  const seen = new Set();
  return candidates
    .filter((profile) => {
      if (seen.has(profile.url)) return false;
      seen.add(profile.url);
      return true;
    })
    .slice(0, 8);
}

function normalizeSummaryText(report) {
  return trimValue(
    report.summary ||
      report.executiveSummary ||
      report.overview ||
      report.output_text ||
      report.outputText,
  );
}

function buildSummaryBullets(summary) {
  const cleanedLines = summary
    .split(/\n+/)
    .map((line) =>
      line
        .replace(/^#{1,6}\s*/, "")
        .replace(/^[-*]\s*/, "")
        .replace(/^\d+\.\s*/, "")
        .trim(),
    )
    .filter((line) => line && !/^(summary|public profiles found|source citations|confidence|risk flags|redactions|warnings):?$/i.test(line));

  const sentencePieces = cleanedLines.length > 1 ? cleanedLines : summary.split(/(?<=[.!?])\s+/);
  return sentencePieces
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function confidenceLabelFromReport(report, evidence, riskFlags) {
  const raw = report.confidence;
  if (typeof raw === "string") {
    const normalized = raw.toLowerCase();
    if (normalized === "high") return "High";
    if (normalized === "medium") return "Medium";
    if (normalized === "low") return "Low";
  }

  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    if (numeric >= 0.75) return "High";
    if (numeric >= 0.45) return "Medium";
    return "Low";
  }

  if (riskFlags.includes("identity_match_ambiguous") || evidence.length < 2) return "Low";
  if (evidence.length >= 5) return "High";
  return "Medium";
}

function identityMatchFromSignals(confidenceLabel, riskFlags, evidenceCount) {
  if (riskFlags.includes("identity_match_ambiguous")) {
    return {
      label: "ambiguous",
      explanation: "Some public signals may refer to similarly named people, so matches should be reviewed.",
    };
  }

  if (confidenceLabel === "High" && evidenceCount >= 3) {
    return {
      label: "strong",
      explanation: "Multiple public sources point to the same identity pattern.",
    };
  }

  if (confidenceLabel === "Medium" || evidenceCount >= 2) {
    return {
      label: "possible",
      explanation: "The public signals are useful but should be treated as a possible match.",
    };
  }

  return {
    label: "low",
    explanation: "There were not enough reliable public signals to make a strong identity match.",
  };
}

function statusFromSignals(summary, evidence, riskFlags, confidenceLabel) {
  if (!summary && evidence.length === 0) return "failed";
  if (confidenceLabel === "Low" || riskFlags.includes("source_coverage_low")) return "partial";
  return "completed";
}

function headlineFromSignals(summaryBullets, status) {
  if (status === "failed") return "Not enough reliable public signals found";
  if (summaryBullets.length > 0) {
    return summaryBullets[0].replace(/\.$/, "").slice(0, 120);
  }
  return "Public web self-audit is ready";
}

function confidenceScore(label) {
  if (label === "High") return 0.82;
  if (label === "Medium") return 0.58;
  return 0.32;
}

export function formatProfileIntelligenceReport(payload = {}, options = {}) {
  const report = payload.report && typeof payload.report === "object" ? payload.report : payload;
  const summaryRedaction = redactSensitiveText(normalizeSummaryText(report));
  const urlEvidence = normalizeEvidence(extractUrls(summaryRedaction.text));
  const evidence = normalizeEvidence(
    report.evidence,
    report.sourceCitations,
    report.sources,
    report.sourceLinks,
    urlEvidence,
  );
  const rawRiskFlags = uniqueStrings(toList(report.riskFlags || report.risk_flags));
  const riskFlags = [...rawRiskFlags];
  if (evidence.length === 0 && !riskFlags.includes("source_coverage_low")) {
    riskFlags.push("source_coverage_low");
  }
  if (/\b(ambiguous|not confirm|cannot confirm|uncertain|insufficient)\b/i.test(summaryRedaction.text)) {
    riskFlags.push("identity_match_ambiguous");
  }

  const confidenceLabel = confidenceLabelFromReport(report, evidence, riskFlags);
  const publicProfiles = normalizePublicProfiles(report.publicProfiles || report.public_profiles, evidence, confidenceLabel);
  const summaryBullets = buildSummaryBullets(summaryRedaction.text);
  const status = statusFromSignals(summaryRedaction.text, evidence, riskFlags, confidenceLabel);
  const missingSignals = uniqueStrings([
    ...toList(report.missingSignals || report.missing_signals || report.missingInformation || report.missing_information),
    ...(evidence.length === 0 ? ["Reliable cited public sources"] : []),
    ...(publicProfiles.length === 0 ? ["Verified public profile links"] : []),
  ]).slice(0, 10);
  const redactions = uniqueStrings([
    ...toList(report.redactions),
    ...summaryRedaction.redactions,
  ]);
  const warnings = uniqueStrings([
    ...toList(report.warnings),
    "Public web self-audit only; not for credit, employment, housing, insurance, or legal eligibility decisions.",
  ]).slice(0, 8);
  const generatedAt =
    trimValue(report.generatedAt || report.generated_at || payload.updatedAt || payload.createdAt) ||
    options.generatedAt ||
    new Date().toISOString();
  const model = trimValue(report.model || report.modelName || report.provider || options.model);

  const viewModel = {
    status,
    generatedAt,
    ...(model ? { model } : {}),
    headline: headlineFromSignals(summaryBullets, status),
    summary: summaryRedaction.text,
    summaryBullets,
    identityMatch: identityMatchFromSignals(confidenceLabel, riskFlags, evidence.length),
    publicProfiles,
    evidence: evidence.slice(0, 8),
    sources: evidence.slice(0, 10).map((item) => ({
      title: item.title,
      url: item.url,
      domain: item.domain,
    })),
    riskFlags: uniqueStrings(riskFlags).slice(0, 10),
    missingSignals,
    missingInformation: missingSignals,
    redactions,
    warnings,
    confidenceLabel,
  };

  return {
    intelligence: viewModel,
    confidence: confidenceScore(confidenceLabel),
  };
}
