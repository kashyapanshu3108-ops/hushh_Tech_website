/**
 * HushhTechFooter — Reusable bottom navigation bar
 * iPhone-attached glass tab bar on mobile; floating glass dock on larger screens.
 *
 * Usage:
 *   <HushhTechFooter
 *     activeTab={HushhFooterTab.HOME}
 *     onTabChange={(tab) => navigate(tab)}
 *   />
 */
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthSession } from "../../auth/AuthSessionProvider";
import {
  buildLoginRedirectPath,
  isGuestAuthRoute,
} from "../../auth/routePolicy";

/** Enum for footer navigation tabs */
export enum HushhFooterTab {
  HOME = "home",
  FUND_A = "fund_a",
  COMMUNITY = "community",
  PROFILE = "profile",
}

interface HushhTechFooterProps {
  /** Currently active tab */
  activeTab?: HushhFooterTab;
  /** Callback when a tab is tapped */
  onTabChange?: (tab: HushhFooterTab) => void;
  /** Extra classes on root container */
  className?: string;
}

/** Static tab configuration */
const STATIC_TABS = [
  { id: HushhFooterTab.HOME, icon: "home", label: "Home" },
  { id: HushhFooterTab.FUND_A, icon: null, label: "Fund A" },
  { id: HushhFooterTab.COMMUNITY, icon: "groups", label: "Comm" },
];

type FooterTabConfig = {
  id: HushhFooterTab;
  icon: string | null;
  label: string;
  path: string;
};

/** Fund A has a custom icon (circle with line) */
const FundAIcon: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  return (
    <div
      className="w-[1.85rem] h-[1.85rem] rounded-full border-[2.5px] flex items-center justify-center transition-colors md:w-7 md:h-7"
      style={{
        borderColor: isActive
          ? "rgba(255,255,255,1)"
          : "rgba(255,255,255,0.72)",
      }}
    >
      <div
        className="w-[2px] h-3 rounded-full transition-colors"
        style={{
          backgroundColor: isActive
            ? "rgba(255,255,255,1)"
            : "rgba(255,255,255,0.72)",
        }}
      />
    </div>
  );
};

const HushhTechFooter: React.FC<HushhTechFooterProps> = ({
  activeTab,
  onTabChange,
  className = "",
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { status } = useAuthSession();
  const isAuthenticated = status === "authenticated";

  const tabs: FooterTabConfig[] = [
    { ...STATIC_TABS[0], path: "/" },
    { ...STATIC_TABS[1], path: "/discover-fund-a" },
    { ...STATIC_TABS[2], path: "/community" },
    {
      id: HushhFooterTab.PROFILE,
      icon: isAuthenticated ? "person" : "login",
      label: isAuthenticated ? "Profile" : "Log In",
      path: isAuthenticated
        ? "/profile"
        : buildLoginRedirectPath("/profile"),
    },
  ];

  const resolvedActiveTab =
    activeTab ??
    (!isAuthenticated && isGuestAuthRoute(location.pathname)
      ? HushhFooterTab.PROFILE
      : undefined);

  /** Handle tab click — use parent callback if provided, else navigate */
  const handleTabClick = (tab: FooterTabConfig) => {
    if (onTabChange) {
      onTabChange(tab.id);
      return;
    } else {
      navigate(tab.path);
    }
  };

  const renderTab = (tab: FooterTabConfig) => {
    const isActive = resolvedActiveTab === tab.id;

    const foregroundColor = isActive
      ? "rgba(255,255,255,1)"
      : "rgba(255,255,255,0.82)";

    return (
      <button
        key={tab.id}
        onClick={() => handleTabClick(tab)}
        className={`group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-[1.95rem] border border-transparent bg-transparent px-1 py-2.5 cursor-pointer outline-none transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 md:py-2 ${
          isActive
            ? "scale-[1.02] border-white/40 bg-white/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.64),inset_0_-1px_0_rgba(255,255,255,0.18),inset_10px_0_24px_rgba(255,255,255,0.10),0_18px_38px_-20px_rgba(255,255,255,0.95)]"
            : "hover:bg-white/10"
        }`}
        style={{
          WebkitTapHighlightColor: "transparent",
          background: isActive
            ? "linear-gradient(140deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.16) 36%, rgba(255,255,255,0.06) 100%)"
            : undefined,
        }}
        aria-label={tab.label}
        aria-current={isActive ? "page" : undefined}
        tabIndex={0}
      >
        {isActive && (
          <>
            <span className="pointer-events-none absolute inset-[1px] rounded-[1.85rem] border border-white/18" />
            <span className="pointer-events-none absolute inset-x-5 top-0 h-px bg-white/65" />
            <span className="pointer-events-none absolute left-4 right-4 top-2 h-5 rounded-full bg-white/18 blur-md" />
          </>
        )}
        {tab.id === HushhFooterTab.FUND_A ? (
          <FundAIcon isActive={isActive} />
        ) : (
          <span
            className="material-symbols-outlined text-[1.95rem] leading-none transition-colors md:text-[1.75rem]"
            style={{
              fontVariationSettings: `'FILL' ${isActive ? 1 : 0}, 'wght' ${
                isActive ? 500 : 400
              }`,
              color: foregroundColor,
              textShadow: "0 1px 12px rgba(0,0,0,0.34)",
            }}
          >
            {tab.icon}
          </span>
        )}
        <span
          className="text-[0.78rem] font-medium tracking-normal leading-none transition-colors md:text-[0.72rem]"
          style={{
            color: foregroundColor,
            textShadow: "0 1px 10px rgba(0,0,0,0.36)",
          }}
        >
          {tab.label}
        </span>
      </button>
    );
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 pointer-events-none px-5 pb-[calc(env(safe-area-inset-bottom,0px)+0.95rem)] pt-4 md:px-4 md:pb-6 ${className}`}
    >
      <div className="relative mx-auto w-full max-w-[23.5rem] pointer-events-auto md:max-w-md">
        <nav
          className="relative isolate flex min-h-[82px] items-center overflow-hidden rounded-[2.4rem] border border-white/42 px-2.5 py-2.5 shadow-[0_28px_88px_-24px_rgba(0,0,0,0.88),0_0_0_1px_rgba(255,255,255,0.10),inset_0_1px_1px_rgba(255,255,255,0.70),inset_0_-1px_1px_rgba(255,255,255,0.24),inset_20px_0_42px_rgba(255,255,255,0.12),inset_-22px_-14px_42px_rgba(0,0,0,0.24)] md:h-[76px] md:min-h-0 md:px-3 md:py-2"
          style={{
            background:
              "linear-gradient(138deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.13) 24%, rgba(35,35,35,0.24) 54%, rgba(0,0,0,0.42) 100%)",
            WebkitBackdropFilter:
              "blur(44px) saturate(235%) contrast(1.12) brightness(0.82)",
            backdropFilter:
              "blur(44px) saturate(235%) contrast(1.12) brightness(0.82)",
          }}
          aria-label="Primary"
        >
          <div className="pointer-events-none absolute inset-[1px] rounded-[2.3rem] border border-white/18" />
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-white/85" />
          <div className="pointer-events-none absolute inset-x-10 top-2 h-8 rounded-full bg-white/22 blur-xl" />
          <div className="pointer-events-none absolute inset-x-10 bottom-1 h-7 rounded-full bg-black/24 blur-xl" />
          <div className="pointer-events-none absolute -left-12 top-0 h-full w-24 rotate-12 bg-white/18 blur-2xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-26%,rgba(255,255,255,0.82),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.20),rgba(255,255,255,0.04)_42%,rgba(255,255,255,0.15))]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_105%,rgba(86,145,255,0.22),transparent_30%),radial-gradient(circle_at_85%_110%,rgba(255,255,255,0.28),transparent_32%)]" />
          <div className="pointer-events-none absolute -inset-7 rounded-[3rem] bg-[conic-gradient(from_160deg_at_50%_50%,transparent_0deg,rgba(255,255,255,0.20)_48deg,transparent_96deg,rgba(100,180,255,0.13)_162deg,transparent_230deg,rgba(255,255,255,0.18)_302deg,transparent_360deg)] opacity-80 blur-xl" />
          <div className="relative flex w-full items-center justify-between gap-1.5 md:gap-2">
            {tabs.map(renderTab)}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default HushhTechFooter;
