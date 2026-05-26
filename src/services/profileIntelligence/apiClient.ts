/**
 * Client service to call the same-origin Cloud Run API for profile intelligence.
 */

import resources from "../../resources/resources";
import { getAuthenticatedSession } from "../../auth/session";
import type { ProfileIntelligence, ShadowProfile } from "../../types/shadowProfile";

export interface GenerateProfileIntelligenceInput {
  name: string;
  email: string;
  zipCode?: string;
}

export interface GenerateProfileIntelligenceResponse {
  success: boolean;
  intelligence?: ProfileIntelligence;
  shadowProfile?: ShadowProfile;
  skipped?: boolean;
  error?: string;
}

export async function generateProfileIntelligence(
  input: GenerateProfileIntelligenceInput
): Promise<GenerateProfileIntelligenceResponse> {
  const zipCode = input.zipCode?.trim() || "";

  if (!zipCode) {
    return {
      success: false,
      skipped: true,
      error: "ZIP code is required for profile intelligence.",
    };
  }

  try {
    const supabase = resources.config.supabaseClient;

    if (!supabase) {
      throw new Error("Supabase client not initialized");
    }

    const session = await getAuthenticatedSession(
      supabase,
      "User not logged in. Please sign in to generate profile intelligence."
    );

    const response = await fetch("/api/generate-profile-intelligence", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        input: {
          name: input.name,
          email: input.email,
          zipCode,
        },
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error || `Profile intelligence service failed with status ${response.status}`
      );
    }

    if (!data.success || !data.shadow_profile?.profileIntelligence) {
      throw new Error("Invalid response from profile intelligence service");
    }

    return {
      success: true,
      intelligence: data.intelligence,
      shadowProfile: data.shadow_profile,
    };
  } catch (error) {
    console.error("Error generating profile intelligence:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
