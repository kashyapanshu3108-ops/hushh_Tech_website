export interface Associate {
  name: string;
  relation: string;
  strength: number;
  category: 'INNER' | 'ORBIT' | 'MEDIA' | 'RIVAL';
}

export interface NewsItem {
  date: string;
  source: string;
  title: string;
  summary: string;
}

export interface ProfileIntelligenceSource {
  title: string;
  url: string;
  domain?: string;
}

export type ProfileIntelligenceStatus = 'completed' | 'partial' | 'failed';
export type ProfileIntelligenceConfidenceLabel = 'High' | 'Medium' | 'Low';
export type ProfileIntelligenceIdentityLabel = 'strong' | 'possible' | 'ambiguous' | 'low';
export type ProfileIntelligenceProfileConfidence = 'high' | 'medium' | 'low';

export interface ProfileIntelligenceIdentityMatch {
  label: ProfileIntelligenceIdentityLabel;
  explanation: string;
}

export interface ProfileIntelligencePublicProfile {
  platform: string;
  title: string;
  url: string;
  confidence: ProfileIntelligenceProfileConfidence;
}

export interface ProfileIntelligenceEvidence {
  title: string;
  domain: string;
  url: string;
  supports: string;
}

export interface ProfileIntelligence {
  summary: string;
  sources: ProfileIntelligenceSource[];
  missingInformation: string[];
  generatedAt: string;
  model?: string;
  status?: ProfileIntelligenceStatus;
  headline?: string;
  summaryBullets?: string[];
  identityMatch?: ProfileIntelligenceIdentityMatch;
  publicProfiles?: ProfileIntelligencePublicProfile[];
  evidence?: ProfileIntelligenceEvidence[];
  riskFlags?: string[];
  missingSignals?: string[];
  redactions?: string[];
  warnings?: string[];
  confidenceLabel?: ProfileIntelligenceConfidenceLabel;
}

export interface ProfileIntelligenceViewModel extends ProfileIntelligence {
  status: ProfileIntelligenceStatus;
  headline: string;
  summaryBullets: string[];
  identityMatch: ProfileIntelligenceIdentityMatch;
  publicProfiles: ProfileIntelligencePublicProfile[];
  evidence: ProfileIntelligenceEvidence[];
  riskFlags: string[];
  missingSignals: string[];
  redactions: string[];
  warnings: string[];
  confidenceLabel: ProfileIntelligenceConfidenceLabel;
}

export interface ShadowProfile {
  profileIntelligence?: ProfileIntelligence;
  confidence?: number;
  age?: string;
  ageContext?: string;
  gender?: string;
  dob?: string;
  occupation?: string;
  nationality?: string;
  address?: string;
  contact?: string;
  maritalStatus?: string;
  children?: string[];
  knownFor?: string[];
  netWorthScore?: number;
  netWorthContext?: string;
  diet?: string;
  foods?: string[];
  hobbies?: string[];
  brands?: string[];
  colors?: string[];
  likes?: string[];
  dislikes?: string[];
  allergies?: string[];
  hotelPreferences?: string[];
  coffeePreferences?: string[];
  drinkPreferences?: string[];
  smokePreferences?: string;
  chaiPreferences?: string[];
  spiciness?: string;
  healthInsurance?: string[];
  agentPreferences?: string[];
  aiPreferences?: string[];
  associates?: Associate[];
  socialMedia?: { platform: string; url: string }[];
  news?: NewsItem[];
}
