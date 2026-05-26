function formatLocation(location) {
  if (location.label) return location.label;
  return [location.city, location.region, location.country].filter(Boolean).join(", ");
}

export function buildDeepResearchPrompt({ subject, consent }) {
  const locationLabel = formatLocation(subject.location);

  return `You are generating a consent-gated public-web self-audit report for Hushh R&D.

Subject:
- Name: ${subject.name}
- User-granted coarse location: ${locationLabel}
- Consent purpose: ${consent.purpose}

Research rules:
- Use only public web sources.
- Treat the subject as the consenting user or an approved internal R&D record.
- Do not reveal home addresses, exact location, private phone numbers, private emails, identity document numbers, credentials, secrets, family-member targeting, or sensitive personal attributes.
- Do not make unverified accusations. If a result is ambiguous or cannot be matched confidently, say so.
- Prefer official profiles, professional profiles, personal websites, publications, GitHub, LinkedIn, company pages, talks, and public directories.
- Include citations for every meaningful claim.
- Keep the output concise and safe for a user-facing privacy self-audit.

Return a safe report with these sections:
1. Summary
2. Public profiles found
3. Source citations
4. Confidence
5. Risk flags
6. Redactions and warnings`;
}
