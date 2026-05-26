/**
 * HushhUserProfile — Revamped UI
 * Clear separation: "Enhance with AI" (BLACK) vs "Save Changes" (WHITE)
 * Edit indicators on all editable fields.
 * Logic stays in logic.ts.
 */
import React from "react";
import { useHushhUserProfileLogic, FIELD_LABELS, VALUE_LABELS } from "./logic";
import { AlertTriangle, Brain, Check, Copy, ExternalLink, Globe, Pencil, Search, ShieldCheck } from "lucide-react";
import { FaApple } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import HushhTechBackHeader from "../../components/hushh-tech-back-header/HushhTechBackHeader";
import HushhTechCta, { HushhTechCtaVariant } from "../../components/hushh-tech-cta/HushhTechCta";
import HushhTechFooter, { HushhFooterTab } from "../../components/hushh-tech-footer/HushhTechFooter";
import NWSScoreBadge from "../../components/profile/NWSScoreBadge";
import { PrivacyShield } from "../../components/profile/PrivacyShield";
import WalletCardPreviewModal from "../../components/wallet/WalletCardPreviewModal";
import type { ProfileIntelligence } from "../../types/shadowProfile";

/* ── Playfair heading style ── */
const playfair = { fontFamily: "'Playfair Display', serif" };

/* ── Tiny reusable row (settings-style) with edit indicator ── */
const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="group flex items-center justify-between gap-4 border-b border-gray-100 py-4 hover:bg-gray-50/50 transition-colors">
    <span className="text-sm text-gray-500 font-light shrink-0">{label}</span>
    <div className="flex items-center gap-2 text-right min-w-0 flex-1 justify-end">
      {children}
      {/* Subtle edit pencil — visible on hover */}
      <Pencil className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </div>
  </div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-4 mt-2 font-medium">{children}</p>
);

const formatGeneratedAt = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const getSourceLabel = (source: ProfileIntelligence["sources"][number]) => {
  if (source.title) return source.title;
  if (source.domain) return source.domain;
  try {
    return new URL(source.url).hostname.replace(/^www\./, "");
  } catch {
    return "Source";
  }
};

const formatMachineLabel = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getConfidencePillClass = (label?: string) => {
  if (label === "High") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (label === "Medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-gray-200 bg-gray-50 text-gray-600";
};

const getIdentityLabel = (label?: string) => {
  if (label === "strong") return "Strong match";
  if (label === "possible") return "Possible match";
  if (label === "ambiguous") return "Ambiguous match";
  return "Low signal";
};

const getStatusText = (status: string, runningLabel: string) => {
  if (status === "running") return `${runningLabel}...`;
  if (status === "done") return "Ready";
  if (status === "error") return "Failed";
  if (status === "skipped") return "Skipped";
  return "Waiting";
};

const getStatusClass = (status: string) => {
  if (status === "running") return "text-gray-400";
  if (status === "done") return "text-ios-green";
  if (status === "error") return "text-red-500";
  if (status === "skipped") return "text-amber-600";
  return "text-gray-300";
};

const ProfileIntelligenceSection = ({
  intelligence,
}: {
  intelligence: ProfileIntelligence;
}) => {
  const sources = intelligence.sources || [];
  const evidence = intelligence.evidence?.length
    ? intelligence.evidence
    : sources.map((source) => ({
        title: source.title,
        domain: source.domain || getSourceLabel(source),
        url: source.url,
        supports: "Public web signal",
      }));
  const topEvidence = evidence.slice(0, 4);
  const summaryBullets =
    intelligence.summaryBullets?.length
      ? intelligence.summaryBullets.slice(0, 5)
      : intelligence.summary
        ? [intelligence.summary]
        : [];
  const publicProfiles = (intelligence.publicProfiles || []).slice(0, 4);
  const missingSignals = (
    intelligence.missingSignals?.length
      ? intelligence.missingSignals
      : intelligence.missingInformation || []
  ).slice(0, 6);
  const riskFlags = (intelligence.riskFlags || []).slice(0, 6);
  const redactions = (intelligence.redactions || []).slice(0, 6);
  const warnings = (intelligence.warnings || []).slice(0, 4);
  const generatedAt = formatGeneratedAt(intelligence.generatedAt);
  const confidenceLabel = intelligence.confidenceLabel || "Low";
  const statusLabel =
    intelligence.status === "completed"
      ? "Ready"
      : intelligence.status === "partial"
        ? "Partial"
        : intelligence.status === "failed"
          ? "Low signal"
          : "Ready";

  if (summaryBullets.length === 0 && topEvidence.length === 0 && publicProfiles.length === 0) {
    return null;
  }

  return (
    <section className="mb-12">
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4 mb-2">
          <h2 className="text-2xl font-medium text-black tracking-tight font-serif" style={playfair}>
            Public Web{" "}
            <span className="text-gray-400 italic font-light">Self-Audit.</span>
          </h2>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${getConfidencePillClass(confidenceLabel)}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            <span className="text-[10px] tracking-[0.14em] uppercase font-medium">{confidenceLabel}</span>
          </span>
        </div>
        <p className="text-gray-500 text-xs leading-relaxed">
          A consent-gated, cited view of public signals Hushh found for your own profile.
        </p>
      </div>

      <div className="py-1 space-y-7">
        <div className="border-y border-gray-100 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-hushh-blue/10">
              <Brain className="h-4 w-4 text-hushh-blue" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-black">{intelligence.headline || "Public web self-audit is ready"}</p>
                <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-gray-400">{statusLabel}</span>
              </div>
              {(generatedAt || intelligence.model) && (
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400">
                  {generatedAt && <span>{generatedAt}</span>}
                  {intelligence.model && <span>{intelligence.model}</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {summaryBullets.length > 0 && (
          <div>
            <SectionLabel>Readable Summary</SectionLabel>
            <ul className="space-y-3 border-b border-gray-100 pb-4">
              {summaryBullets.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-gray-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {intelligence.identityMatch && (
          <div className="border-b border-gray-100 pb-4">
            <SectionLabel>Identity Match</SectionLabel>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-hushh-blue" />
              <div>
                <p className="text-sm font-medium text-black">{getIdentityLabel(intelligence.identityMatch.label)}</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">{intelligence.identityMatch.explanation}</p>
              </div>
            </div>
          </div>
        )}

        {publicProfiles.length > 0 && (
          <div>
            <SectionLabel>Public Profiles</SectionLabel>
            <div className="space-y-2">
              {publicProfiles.map((profile) => (
                <a
                  key={profile.url}
                  href={profile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 border-b border-gray-100 py-3 text-sm hover:bg-gray-50/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-black">{profile.platform}</p>
                    <p className="truncate text-xs text-gray-500">{profile.title}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.14em] text-gray-400">{profile.confidence}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-hushh-blue" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        <div>
          <SectionLabel>Evidence</SectionLabel>
          {topEvidence.length > 0 ? (
            <div className="space-y-2 border-b border-gray-100 pb-4">
              {topEvidence.map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2 text-sm text-hushh-blue hover:border-hushh-blue/30"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{source.title}</p>
                    <p className="truncate text-[11px] text-gray-400">{source.domain} · {source.supports}</p>
                  </div>
                  <Globe className="h-3.5 w-3.5 shrink-0" />
                </a>
              ))}
            </div>
          ) : (
            <p className="border-b border-gray-100 pb-4 text-sm text-gray-400">Not enough reliable cited sources found.</p>
          )}
        </div>

        {missingSignals.length > 0 && (
          <div className="border-b border-gray-100 pb-4">
            <SectionLabel>Missing Signals</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {missingSignals.map((item) => (
                <span key={item} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-700">
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {(riskFlags.length > 0 || redactions.length > 0 || warnings.length > 0) && (
          <details className="group border-b border-gray-100 pb-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-black">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Risk and privacy notes
              </span>
              <Search className="h-4 w-4 text-gray-300 transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-4 space-y-4">
              {riskFlags.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-gray-500">Risk flags</p>
                  <div className="flex flex-wrap gap-2">
                    {riskFlags.map((item) => (
                      <span key={item} className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600">
                        {formatMachineLabel(item)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {redactions.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-gray-500">Redacted</p>
                  <div className="flex flex-wrap gap-2">
                    {redactions.map((item) => (
                      <span key={item} className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs text-rose-700">
                        {formatMachineLabel(item)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {warnings.length > 0 && (
                <div className="space-y-2">
                  {warnings.map((item) => (
                    <p key={item} className="text-xs leading-relaxed text-gray-500">{item}</p>
                  ))}
                </div>
              )}
            </div>
          </details>
        )}

        {intelligence.status === "failed" && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-500">
            Not enough reliable public signals found yet. Add clearer public profile links or try again later.
          </div>
        )}
      </div>
    </section>
  );
};

/* Inline input class */
const inlineInput = "text-right text-sm font-medium bg-transparent border-none focus:ring-0 p-0 text-black w-full";

/* ── Page ── */
const HushhUserProfilePage: React.FC = () => {
  const {
    form, investorProfile, shadowProfile, loading, loadingSeconds, isProcessing, investorStatus, intelligenceStatus,
    hasOnboardingData, isApplePassLoading, isGooglePassLoading, nwsResult, nwsLoading,
    isWalletPreviewOpen, appleWalletSupported, appleWalletSupportMessage,
    googleWalletSupported, googleWalletSupportMessage, walletPreview,
    hasCopied, onCopy, profileUrl, navigate,
    handleChange, handleBack, handleSave,
    isDirty, isSaving, handleSaveChanges,
    handleAppleWalletPass, handleGoogleWalletPass, COUNTRIES,
    openWalletPreview, closeWalletPreview,
    editingField, setEditingField, FIELD_OPTIONS, MULTI_SELECT_FIELDS,
    handleUpdateAIField, handleMultiSelectToggle, getConfidenceLabel, getConfidenceBadgeClass,
  } = useHushhUserProfileLogic();

  const firstName = form.name?.split(" ")[0] || "Investor";
  const profileIntelligence = shadowProfile?.profileIntelligence;

  return (
    <div className="bg-white text-gray-900 min-h-screen antialiased flex flex-col selection:bg-hushh-blue selection:text-white">
      {/* ═══ Header ═══ */}
      <HushhTechBackHeader onBackClick={handleBack} rightType="hamburger" />

      <main className="px-6 flex-grow max-w-md mx-auto w-full pb-48">
        {/* ── Hero ── */}
        <section className="py-8">
          <div className="inline-block px-3 py-1 mb-4 border border-hushh-blue/20 rounded-full bg-hushh-blue/5">
            <span className="text-[10px] tracking-widest uppercase font-medium text-hushh-blue flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-hushh-blue rounded-full" />
              Premium Member
            </span>
          </div>
          <h1
            className="text-[2.25rem] leading-[1.15] font-normal text-black tracking-tight font-serif"
            style={playfair}
          >
            Investor{" "}
            <span className="text-gray-400 italic font-light">Profile.</span>
          </h1>
          <p className="text-gray-500 text-sm font-light mt-2">
            Welcome back, {firstName}.
          </p>
        </section>

        {/* ── NWS strip ── */}
        <section className="mb-10 border-t border-b border-gray-100 py-5 flex justify-between items-center">
          <span
            className="text-lg italic text-gray-400 font-serif"
            style={playfair}
          >
            Net Worth Score
          </span>
          {nwsResult ? (
            <NWSScoreBadge result={nwsResult} loading={nwsLoading} size="sm" />
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-200 bg-gray-50">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              <span className="text-[10px] tracking-[0.14em] uppercase text-gray-400 font-medium">
                Non-Verified
              </span>
            </span>
          )}
        </section>

        {/* ── Processing Banner ── */}
        {isProcessing && (
          <section className="mb-6 border border-hushh-blue/20 rounded-2xl p-4 bg-hushh-blue/5 animate-pulse-slow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-medium">
                Building Profile · {loadingSeconds}s
              </span>
              <span className="w-2 h-2 bg-hushh-blue rounded-full animate-ping" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Investor Profile</span>
                <span className={`text-[10px] uppercase tracking-widest font-medium ${getStatusClass(investorStatus)}`}>
                  {getStatusText(investorStatus, "Analyzing")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Profile Intelligence</span>
                <span className={`text-[10px] uppercase tracking-widest font-medium ${getStatusClass(intelligenceStatus)}`}>
                  {getStatusText(intelligenceStatus, "Researching")}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* ── AI Section ── */}
        <section className="mb-12">
          <h2
            className="text-xl font-medium text-black tracking-tight mb-3 font-serif"
            style={playfair}
          >
            AI-Powered Profile Intelligence
          </h2>
          <p className="text-gray-500 text-sm font-light mb-6 leading-relaxed">
            Hushh AI automatically detects your investment preferences and risk
            appetite to tailor opportunities specifically for you.
          </p>
          <HushhTechCta variant={HushhTechCtaVariant.BLACK} onClick={handleSave} disabled={loading || isProcessing}>
            {loading
              ? `Generating... ${loadingSeconds}s`
              : investorProfile
              ? "Re-enhance with AI"
              : hasOnboardingData
              ? "Enhance with AI"
              : "Generate Investor Profile"}
            <span className="material-symbols-outlined text-lg">auto_awesome</span>
          </HushhTechCta>
        </section>

        {/* ── AI-Generated Investment Profile ── */}
        {investorProfile && Object.keys(investorProfile).length > 0 && (
          <section className="mb-12">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-medium text-black tracking-tight font-serif" style={playfair}>
                  Investment{" "}
                  <span className="text-gray-400 italic font-light">Profile.</span>
                </h2>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-hushh-blue/20 bg-hushh-blue/5">
                  <span className="w-1.5 h-1.5 bg-hushh-blue rounded-full" />
                  <span className="text-[10px] tracking-[0.14em] uppercase text-hushh-blue font-medium">AI Analyzed</span>
                </span>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed">
                AI-detected preferences based on your profile data. Tap any field to adjust.
              </p>
            </div>

            <div className="py-1">
              <SectionLabel>AI Preferences</SectionLabel>
              {Object.entries(investorProfile).map(([fieldName, fieldData]: [string, any]) => {
                if (!fieldData || typeof fieldData !== 'object') return null;
                const label = FIELD_LABELS[fieldName as keyof typeof FIELD_LABELS] || fieldName;
                const valueText = Array.isArray(fieldData.value)
                  ? fieldData.value.map((v: string) => VALUE_LABELS[v as keyof typeof VALUE_LABELS] || v).join(", ")
                  : VALUE_LABELS[fieldData.value as keyof typeof VALUE_LABELS] || fieldData.value;
                const confidence = fieldData.confidence || 0;
                const confLabel = getConfidenceLabel(confidence);
                const isEditing = editingField === fieldName;
                const options = FIELD_OPTIONS[fieldName];
                const isMulti = MULTI_SELECT_FIELDS.includes(fieldName);

                return (
                  <div key={fieldName}>
                    <div
                      className="group flex items-center justify-between gap-4 border-b border-gray-100 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer"
                      onClick={() => options && setEditingField(isEditing ? null : fieldName)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Edit ${label}`}
                      onKeyDown={(e) => { if (e.key === 'Enter' && options) setEditingField(isEditing ? null : fieldName); }}
                    >
                      <span className="text-sm text-gray-500 font-light shrink-0">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-black truncate max-w-[140px]">{valueText || "—"}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border shrink-0 ${getConfidenceBadgeClass(confidence)}`}>
                          {confLabel}
                        </span>
                        {options && (
                          <Pencil className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        )}
                      </div>
                    </div>
                    {/* Inline edit when tapped */}
                    {isEditing && options && (
                      <div className="px-1 pb-4 pt-1" onClick={(e) => e.stopPropagation()}>
                        {isMulti ? (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {options.map((opt) => {
                              const currentVals = Array.isArray(fieldData.value) ? fieldData.value : [];
                              const isSelected = currentVals.includes(opt.value);
                              return (
                                <button
                                  key={opt.value}
                                  onClick={() => handleMultiSelectToggle(fieldName, opt.value)}
                                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                    isSelected ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="relative mb-2">
                            <select
                              value={fieldData.value || ""}
                              onChange={(e) => handleUpdateAIField(fieldName, e.target.value)}
                              className="appearance-none w-full bg-transparent border-none focus:ring-0 p-0 pr-6 text-sm font-medium text-black text-right cursor-pointer"
                            >
                              {options.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                            <span className="material-symbols-outlined text-gray-300 text-lg absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
                          </div>
                        )}
                        <button onClick={() => setEditingField(null)} className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Done</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {profileIntelligence && (
          <ProfileIntelligenceSection intelligence={profileIntelligence} />
        )}

        {/* ── Your Hushh Profile (editable section) ── */}
        <section className="mb-6">
          <div className="mb-8">
            <h2
              className="text-2xl font-medium text-black tracking-tight mb-2 font-serif"
              style={playfair}
            >
              Your Hushh{" "}
              <span className="text-gray-400 italic font-light">Profile.</span>
            </h2>
            <p className="text-gray-500 text-xs leading-relaxed">
              Tap any field to edit your details. Changes are saved separately from AI analysis.
            </p>
            {/* Edit hint banner */}
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
              <Pencil className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="text-[11px] text-gray-400">Tap any field to edit · click "Save Changes" to update</span>
            </div>
          </div>

          {/* Personal Information */}
          <div className="py-1">
            <SectionLabel>Personal Information</SectionLabel>
            <FieldRow label="Full Name">
              <input type="text" value={form.name} onChange={(e) => handleChange("name", e.target.value)} className={inlineInput} placeholder="Your Name" />
            </FieldRow>
            <PrivacyShield
              email={form.email}
              phone={`${form.phoneCountryCode} ${form.phoneNumber}`.trim()}
              className="my-4"
              emailControl={
                <input
                  type="email"
                  aria-label="Email address"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className={inlineInput}
                  placeholder="you@email.com"
                />
              }
              phoneControl={
                <div className="flex items-center gap-1 min-w-0">
                  <select
                    aria-label="Phone country code"
                    value={form.phoneCountryCode}
                    onChange={(e) => handleChange("phoneCountryCode", e.target.value)}
                    className="appearance-none bg-transparent border-none focus:ring-0 p-0 text-sm font-medium text-black text-right shrink-0"
                  >
                    <option value="+1">+1</option>
                    <option value="+44">+44</option>
                    <option value="+91">+91</option>
                  </select>
                  <input
                    type="tel"
                    aria-label="Phone number"
                    value={form.phoneNumber}
                    onChange={(e) => handleChange("phoneNumber", e.target.value)}
                    className={inlineInput}
                    placeholder="98765 43210"
                  />
                </div>
              }
            />
            <FieldRow label="Age">
              <input type="number" value={form.age} onChange={(e) => handleChange("age", e.target.value)} className={inlineInput} placeholder="34" />
            </FieldRow>
          </div>

          {/* Investment Details */}
          <div className="py-8">
            <SectionLabel>Investment Details</SectionLabel>
            <FieldRow label="Organisation">
              <input type="text" value={form.organisation} onChange={(e) => handleChange("organisation", e.target.value)} className={inlineInput} placeholder="Company Name" />
            </FieldRow>
            <FieldRow label="Account Type">
              <div className="relative">
                <select value={form.accountType} onChange={(e) => handleChange("accountType", e.target.value)} className="appearance-none bg-transparent border-none focus:ring-0 p-0 pr-6 text-sm font-medium text-black text-right cursor-pointer">
                  <option value="" disabled>Select</option>
                  <option value="individual">Individual</option>
                  <option value="joint">Joint</option>
                  <option value="retirement">Retirement (IRA)</option>
                  <option value="trust">Trust</option>
                </select>
                <span className="material-symbols-outlined text-gray-300 text-lg absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
              </div>
            </FieldRow>
            <FieldRow label="Account Structure">
              <div className="relative">
                <select value={form.accountStructure} onChange={(e) => handleChange("accountStructure", e.target.value)} className="appearance-none bg-transparent border-none focus:ring-0 p-0 pr-6 text-sm font-medium text-black text-right cursor-pointer">
                  <option value="" disabled>Select</option>
                  <option value="discretionary">Discretionary</option>
                  <option value="non-discretionary">Non-Discretionary</option>
                </select>
                <span className="material-symbols-outlined text-gray-300 text-lg absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
              </div>
            </FieldRow>
            <FieldRow label="Selected Fund">
              <div className="relative">
                <select value={form.selectedFund} onChange={(e) => handleChange("selectedFund", e.target.value)} className="appearance-none bg-transparent border-none focus:ring-0 p-0 pr-6 text-sm font-medium text-black text-right cursor-pointer">
                  <option value="" disabled>Choose</option>
                  <option value="hushh_fund_a">Fund A</option>
                  <option value="hushh_fund_b">Fund B</option>
                  <option value="hushh_fund_c">Fund C</option>
                </select>
                <span className="material-symbols-outlined text-gray-300 text-lg absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
              </div>
            </FieldRow>
            <FieldRow label="Initial Investment">
              <input
                type="text"
                value={form.initialInvestmentAmount ? `$${Number(form.initialInvestmentAmount).toLocaleString()}` : ""}
                onChange={(e) => { const raw = e.target.value.replace(/[^0-9]/g, ""); handleChange("initialInvestmentAmount", raw); }}
                className={inlineInput}
                placeholder="$50,000"
              />
            </FieldRow>
          </div>

          {/* Legal & Residential */}
          <div className="py-2">
            <SectionLabel>Legal &amp; Residential</SectionLabel>
            <FieldRow label="Country">
              <div className="relative inline-flex">
                <select value={form.citizenshipCountry} onChange={(e) => handleChange("citizenshipCountry", e.target.value)} className="appearance-none bg-transparent border-none focus:ring-0 p-0 pr-6 text-sm font-medium text-black text-right cursor-pointer">
                  <option value="" disabled>Select</option>
                  {COUNTRIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
                <span className="material-symbols-outlined text-gray-300 text-lg absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
              </div>
            </FieldRow>
            <FieldRow label="State">
              <input type="text" value={form.state} onChange={(e) => handleChange("state", e.target.value)} className={inlineInput} placeholder="State" />
            </FieldRow>
            <FieldRow label="Address">
              <input type="text" value={form.addressLine1} onChange={(e) => handleChange("addressLine1", e.target.value)} className={inlineInput} placeholder="Street address" />
            </FieldRow>
            <FieldRow label="City">
              <input type="text" value={form.city} onChange={(e) => handleChange("city", e.target.value)} className={inlineInput} placeholder="City" />
            </FieldRow>
            <FieldRow label="Zip Code">
              <input type="text" value={form.zipCode} onChange={(e) => handleChange("zipCode", e.target.value)} className={inlineInput} placeholder="560001" />
            </FieldRow>
          </div>

          {/* Save Changes button — right after editable fields, WHITE variant */}
          <div className="mt-6">
            <HushhTechCta variant={HushhTechCtaVariant.WHITE} onClick={handleSaveChanges} disabled={!isDirty || isSaving}>
              {isSaving ? (
                <>Saving... <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span></>
              ) : isDirty ? (
                <>Save Changes <span className="material-symbols-outlined text-lg">save</span></>
              ) : (
                <>Profile Saved <Check className="w-4 h-4 text-gray-400" /></>
              )}
            </HushhTechCta>
          </div>
        </section>

        {/* ── Profile Link + Wallet ── */}
        <section className="mb-12 border-t border-gray-200 pt-8">
          <div className="flex items-center justify-between py-3 mb-6">
            <span className="text-sm text-gray-500 font-light">Profile Link</span>
            <button type="button" onClick={onCopy} className="flex items-center gap-2 text-hushh-blue cursor-pointer">
              <span className="text-xs font-medium truncate max-w-[160px]">{profileUrl || "hushhtech.com/investor/..."}</span>
              {hasCopied ? <Check className="w-4 h-4 text-ios-green" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <button
            type="button"
            onClick={openWalletPreview}
            className="mb-4 w-full border border-gray-200 rounded-2xl py-3 px-4 flex items-center justify-center gap-2 hover:border-hushh-blue/30 transition-colors"
          >
            <span className="text-xs font-medium">View Hushh Gold Pass</span>
          </button>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={handleAppleWalletPass}
              disabled={isApplePassLoading || !appleWalletSupported}
              className="border border-gray-200 rounded-2xl py-3 px-4 flex items-center justify-center gap-2 hover:border-hushh-blue/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaApple className="text-lg" />
              <span className="text-xs font-medium">{isApplePassLoading ? "Loading..." : "Apple Wallet"}</span>
            </button>
            <button type="button" onClick={handleGoogleWalletPass} disabled={isGooglePassLoading || !googleWalletSupported} className="border border-gray-200 rounded-2xl py-3 px-4 flex items-center justify-center gap-2 hover:border-hushh-blue/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <FcGoogle className="text-lg" />
              <span className="text-xs font-medium">{isGooglePassLoading ? "Loading..." : "Google Wallet"}</span>
            </button>
          </div>
          {!appleWalletSupported && (
            <p className="mt-3 text-xs text-gray-500 font-light">
              {appleWalletSupportMessage}
            </p>
          )}
          {!googleWalletSupported && (
            <p className="mt-3 text-xs text-gray-500 font-light">
              {googleWalletSupportMessage}
            </p>
          )}
        </section>

        <WalletCardPreviewModal
          isOpen={isWalletPreviewOpen}
          onClose={closeWalletPreview}
          preview={walletPreview}
          appleWalletSupported={appleWalletSupported}
          appleWalletSupportMessage={appleWalletSupportMessage}
          onAddToAppleWallet={handleAppleWalletPass}
          isApplePassLoading={isApplePassLoading}
          googleWalletAvailable={googleWalletSupported}
          googleWalletSupportMessage={googleWalletSupportMessage}
          onAddToGoogleWallet={handleGoogleWalletPass}
          isGooglePassLoading={isGooglePassLoading}
        />

        {/* ── Bottom CTA ── */}
        <section className="pb-12">
          <HushhTechCta variant={HushhTechCtaVariant.WHITE} onClick={() => navigate("/")}>
            Go to Home
          </HushhTechCta>
        </section>
      </main>

      {/* ═══ Footer Nav ═══ */}
      <HushhTechFooter activeTab={HushhFooterTab.PROFILE} />
    </div>
  );
};

export default HushhUserProfilePage;
