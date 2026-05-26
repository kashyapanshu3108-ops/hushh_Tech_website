import { ValidationError } from "./errors.js";

const ALLOWED_PURPOSES = new Set(["self_audit", "rd_internal"]);
const EXACT_LOCATION_KEYS = new Set([
  "address",
  "addressLine1",
  "address_line_1",
  "street",
  "streetAddress",
  "street_address",
  "houseNumber",
  "house_number",
  "postalCode",
  "postal_code",
  "zip",
  "zipcode",
  "latitude",
  "longitude",
  "lat",
  "lng",
  "coordinates",
  "plusCode",
  "plus_code",
]);

const SENSITIVE_REQUEST_PATTERNS = [
  /\b(ssn|social security|aadhaar|aadhar|passport|driver'?s license|credit card)\b/i,
  /\b(password|api key|secret key|private key|access token|bearer token)\b/i,
  /\b(child|minor|underage|school student)\b/i,
];

const EXACT_ADDRESS_PATTERN =
  /\b\d{1,6}\s+[\w.'-]+(?:\s+[\w.'-]+){0,5}\s+(street|st|road|rd|avenue|ave|lane|ln|drive|dr|boulevard|blvd|apartment|apt|suite|unit|flat)\b/i;

function trim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function hasSensitiveTerms(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? {});
  return SENSITIVE_REQUEST_PATTERNS.some((pattern) => pattern.test(text));
}

function findExactLocationKeys(value, path = "subject.location") {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const hits = [];
  for (const [key, nestedValue] of Object.entries(value)) {
    const currentPath = `${path}.${key}`;
    if (EXACT_LOCATION_KEYS.has(key)) {
      hits.push(currentPath);
    }
    if (nestedValue && typeof nestedValue === "object" && !Array.isArray(nestedValue)) {
      hits.push(...findExactLocationKeys(nestedValue, currentPath));
    }
  }
  return hits;
}

function normalizeLocation(location) {
  if (typeof location === "string") {
    const normalized = trim(location);
    if (!normalized) {
      throw new ValidationError("subject.location is required");
    }
    if (EXACT_ADDRESS_PATTERN.test(normalized)) {
      throw new ValidationError("subject.location must be reduced to city, region, and country");
    }
    return { label: normalized };
  }

  if (!location || typeof location !== "object" || Array.isArray(location)) {
    throw new ValidationError("subject.location must be a city/region/country object or label");
  }

  const exactKeys = findExactLocationKeys(location);
  if (exactKeys.length > 0) {
    throw new ValidationError("subject.location must not include exact address or GPS fields");
  }

  const normalized = {
    city: trim(location.city),
    region: trim(location.region || location.state || location.province),
    country: trim(location.country),
  };

  if (!normalized.city && !normalized.region && !normalized.country) {
    throw new ValidationError("subject.location must include at least city, region, or country");
  }

  return Object.fromEntries(Object.entries(normalized).filter(([, value]) => Boolean(value)));
}

export function validateReportRequest(body = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("Request body must be a JSON object");
  }

  const subject = body.subject || {};
  const consent = body.consent || {};
  const name = trim(subject.name);

  if (!name) {
    throw new ValidationError("subject.name is required");
  }

  if (name.length > 120) {
    throw new ValidationError("subject.name must be 120 characters or fewer");
  }

  const age = Number(subject.age);
  if (Number.isFinite(age) && age < 18) {
    throw new ValidationError("Reports for minors are not supported");
  }

  if (hasSensitiveTerms(subject)) {
    throw new ValidationError("Request includes sensitive or minor-related terms that are not allowed");
  }

  if (consent.accepted !== true) {
    throw new ValidationError("consent.accepted must be true");
  }

  const purpose = trim(consent.purpose);
  if (!ALLOWED_PURPOSES.has(purpose)) {
    throw new ValidationError('consent.purpose must be "self_audit" or "rd_internal"');
  }

  return {
    subject: {
      name,
      location: normalizeLocation(subject.location),
    },
    consent: {
      accepted: true,
      purpose,
      recordedAt: trim(consent.recordedAt) || new Date().toISOString(),
    },
  };
}
