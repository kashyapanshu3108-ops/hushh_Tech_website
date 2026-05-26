import { ValidationError } from "./errors.js";

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function trim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function firstValue(...values) {
  return values.map(trim).find(Boolean) || "";
}

function fallbackLocation(browserContext = {}) {
  const timezone = trim(browserContext.timezone);
  const locale = trim(browserContext.locale);
  return {
    region: timezone || locale || "coarse-location-unavailable",
  };
}

function getClientIp(req) {
  const forwarded = trim(req?.get?.("x-forwarded-for") || req?.headers?.["x-forwarded-for"]);
  const firstForwarded = forwarded.split(",").map((value) => value.trim()).find(Boolean);
  const raw = firstForwarded || trim(req?.get?.("x-real-ip") || req?.headers?.["x-real-ip"]) || trim(req?.ip);
  return raw.replace(/^::ffff:/, "");
}

function isPublicIp(ip) {
  if (!ip) return false;
  if (ip === "::1" || ip === "127.0.0.1" || ip === "localhost") return false;
  if (/^10\./.test(ip)) return false;
  if (/^192\.168\./.test(ip)) return false;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return false;
  return /^[0-9a-f:.]+$/i.test(ip);
}

async function coarsenRequestLocation(req, browserContext = {}) {
  const clientIp = getClientIp(req);
  if (!isPublicIp(clientIp)) {
    return fallbackLocation(browserContext);
  }

  try {
    const response = await fetch(`https://ipapi.co/${encodeURIComponent(clientIp)}/json/`, {
      headers: {
        "User-Agent": "hushh-deep-intelligence-api-lab/0.1",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return fallbackLocation(browserContext);
    }

    const data = await response.json();
    const coarse = {
      city: trim(data.city),
      region: trim(data.region),
      country: trim(data.country_name),
    };
    const filtered = Object.fromEntries(Object.entries(coarse).filter(([, value]) => Boolean(value)));
    return Object.keys(filtered).length > 0 ? filtered : fallbackLocation(browserContext);
  } catch {
    return fallbackLocation(browserContext);
  }
}

export async function coarsenBrowserLocation(browserLocation = {}, browserContext = {}) {
  const latitude = toFiniteNumber(browserLocation.latitude);
  const longitude = toFiniteNumber(browserLocation.longitude);

  if (latitude === null || longitude === null) {
    throw new ValidationError("Browser location permission is required for the lab UI");
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new ValidationError("Browser location coordinates are invalid");
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("zoom", "10");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));

    const response = await fetch(url, {
      headers: {
        "User-Agent": "hushh-deep-intelligence-api-lab/0.1",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return fallbackLocation(browserContext);
    }

    const data = await response.json();
    const address = data?.address || {};
    const city = firstValue(
      address.city,
      address.town,
      address.village,
      address.municipality,
      address.county,
    );
    const region = firstValue(address.state, address.region, address.state_district);
    const country = firstValue(address.country);
    const coarse = { city, region, country };
    const filtered = Object.fromEntries(Object.entries(coarse).filter(([, value]) => Boolean(value)));

    return Object.keys(filtered).length > 0 ? filtered : fallbackLocation(browserContext);
  } catch {
    return fallbackLocation(browserContext);
  }
}

export async function coarsenLabLocation({ browserLocation, browserContext, req }) {
  const latitude = toFiniteNumber(browserLocation?.latitude);
  const longitude = toFiniteNumber(browserLocation?.longitude);

  if (latitude !== null && longitude !== null) {
    return coarsenBrowserLocation(browserLocation, browserContext);
  }

  return coarsenRequestLocation(req, browserContext);
}
