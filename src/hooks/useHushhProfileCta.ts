import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { useAuthSession } from "../auth/AuthSessionProvider";
import config from "../resources/config/config";
import {
  FINANCIAL_LINK_ROUTE,
  getContinueOnboardingCta,
  hasClearedFinancialLink,
} from "../services/onboarding/flow";
import { fetchResolvedOnboardingProgress } from "../services/onboarding/progress";

export interface HushhProfileCta {
  text: string;
  action: () => void;
  loading: boolean;
}

export interface HushhProfileCtaResult {
  session: Session | null;
  primaryCTA: HushhProfileCta;
}

interface OnboardingStatus {
  hasProfile: boolean;
  isCompleted: boolean;
  currentStep: number;
  financialLinkStatus: "pending" | "completed" | "skipped";
  loading: boolean;
}

interface UseHushhProfileCtaOptions {
  enabled?: boolean;
}

export const useHushhProfileCta = (
  options: UseHushhProfileCtaOptions = {}
): HushhProfileCtaResult => {
  const { enabled = true } = options;
  const navigate = useNavigate();
  const { session } = useAuthSession();
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>({
    hasProfile: false,
    isCompleted: false,
    currentStep: 1,
    financialLinkStatus: "pending",
    loading: true,
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const checkUserStatus = async () => {
      if (
        !session?.user?.id ||
        !config.supabaseClient ||
        typeof config.supabaseClient.from !== "function"
      ) {
        setOnboardingStatus((prev) => ({ ...prev, loading: false }));
        return;
      }

      try {
        const { data: profile, error: profileError } =
          await config.supabaseClient
            .from("investor_profiles")
            .select("id, user_confirmed")
            .eq("user_id", session.user.id)
            .maybeSingle();

        const onboarding = await fetchResolvedOnboardingProgress(
          config.supabaseClient,
          session.user.id
        );

        setOnboardingStatus({
          hasProfile: !!profile && !profileError,
          isCompleted: onboarding?.is_completed || false,
          currentStep: onboarding?.current_step || 1,
          financialLinkStatus:
            onboarding?.financial_link_status || "pending",
          loading: false,
        });
      } catch (error) {
        console.error("Error checking user status:", error);
        setOnboardingStatus((prev) => ({ ...prev, loading: false }));
      }
    };

    void checkUserStatus();
  }, [enabled, session?.user?.id]);

  const completeProfile = useCallback(() => {
    navigate(FINANCIAL_LINK_ROUTE);
  }, [navigate]);

  const viewProfile = useCallback(() => {
    navigate("/hushh-user-profile");
  }, [navigate]);

  return useMemo(() => {
    if (!session) {
      return {
        session,
        primaryCTA: {
          text: "Complete Your Hushh Profile",
          action: completeProfile,
          loading: false,
        },
      };
    }

    if (onboardingStatus.loading) {
      return {
        session,
        primaryCTA: { text: "Loading...", action: () => {}, loading: true },
      };
    }

    if (onboardingStatus.hasProfile || onboardingStatus.isCompleted) {
      return {
        session,
        primaryCTA: {
          text: "View Your Profile",
          action: viewProfile,
          loading: false,
        },
      };
    }

    if (hasClearedFinancialLink(onboardingStatus.financialLinkStatus)) {
      const cta = getContinueOnboardingCta(onboardingStatus.currentStep);
      return {
        session,
        primaryCTA: {
          text: cta.text,
          action: () => navigate(cta.route),
          loading: false,
        },
      };
    }

    return {
      session,
      primaryCTA: {
        text: "Complete Your Hushh Profile",
        action: completeProfile,
        loading: false,
      },
    };
  }, [
    completeProfile,
    navigate,
    onboardingStatus.currentStep,
    onboardingStatus.financialLinkStatus,
    onboardingStatus.hasProfile,
    onboardingStatus.isCompleted,
    onboardingStatus.loading,
    session,
    viewProfile,
  ]);
};
