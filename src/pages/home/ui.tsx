import { useHomeLogic } from "./logic";
import HushhTechHeader from "../../components/hushh-tech-header/HushhTechHeader";
import HushhTechFooter, {
  HushhFooterTab,
} from "../../components/hushh-tech-footer/HushhTechFooter";
import HushhTechCta, {
  HushhTechCtaVariant,
} from "../../components/hushh-tech-cta/HushhTechCta";

const playfair = { fontFamily: "'Playfair Display', serif" };

export default function HomePage() {
  const { primaryCTA, onNavigate } = useHomeLogic();
  const heroPrimaryText = primaryCTA.loading
    ? primaryCTA.text
    : primaryCTA.text === "View Your Profile"
      ? "View Investor Profile"
      : "Invest With Hushh";

  return (
    <div
      data-page="home"
      className="bg-white antialiased text-gray-900 min-h-screen flex flex-col relative selection:bg-hushh-blue selection:text-white overflow-x-hidden"
    >
      <HushhTechHeader />

      <main
        id="main-content"
        className="flex-1 w-full max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 pb-32 lg:pb-14 pt-2 sm:pt-4"
      >
        <div className="flex flex-col gap-16 lg:min-h-[calc(100vh-6rem)] lg:gap-20">
          <section
            className="flex flex-col items-center gap-12 pt-8 text-center sm:pt-12 lg:min-h-[78vh] lg:justify-center lg:gap-14"
            aria-labelledby="home-hero-heading"
          >
            <div className="flex w-full min-w-0 max-w-3xl flex-col items-center justify-center">
              <p className="mb-4 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-gray-400">
                Hushh Technologies
              </p>
              <h1
                id="home-hero-heading"
                className="max-w-[11ch] text-[3.15rem] leading-[1.01] font-normal text-black tracking-tight font-serif sm:text-[4.1rem] lg:text-[5rem]"
                style={playfair}
              >
                Investing in <br /> the{" "}
                <span className="text-gray-400 italic font-light">Future.</span>
              </h1>
              <p className="mt-6 max-w-[42rem] text-[1.06rem] font-light leading-[1.65] text-gray-500 sm:text-[1.28rem]">
                The world's first AI-powered Berkshire Hathaway. Merging rigorous
                data science with human wisdom.
              </p>
              <div className="mt-10 grid w-full max-w-[29rem] gap-3 sm:grid-cols-2">
                <HushhTechCta
                  onClick={primaryCTA.action}
                  disabled={primaryCTA.loading}
                  variant={HushhTechCtaVariant.BLACK}
                  aria-busy={primaryCTA.loading}
                  className="h-[3.15rem] rounded-full text-[0.95rem] shadow-[0_14px_32px_-24px_rgba(0,0,0,0.7)] hover:shadow-[0_18px_38px_-24px_rgba(0,0,0,0.8)]"
                >
                  {primaryCTA.loading ? (
                    <>
                      <span
                        className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"
                        aria-hidden="true"
                      />
                      {heroPrimaryText}
                    </>
                  ) : (
                    <>
                      {heroPrimaryText}
                      <span className="material-symbols-outlined thin-icon text-lg" aria-hidden="true">
                        arrow_forward
                      </span>
                    </>
                  )}
                </HushhTechCta>
                <HushhTechCta
                  onClick={() => onNavigate("/discover-fund-a")}
                  variant={HushhTechCtaVariant.WHITE}
                  aria-label="Discover Fund A — learn about our flagship product"
                  className="h-[3.15rem] rounded-full border-gray-300 text-[0.95rem]"
                >
                  Discover Fund A
                </HushhTechCta>
              </div>
              <div className="mt-8 flex w-full max-w-[29rem] flex-col items-center gap-3 border-y border-gray-100 py-5 sm:flex-row sm:justify-center sm:gap-8">
                <div className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined thin-icon text-xl text-ios-green" aria-hidden="true">
                    verified_user
                  </span>
                  <span className="text-[0.7rem] font-medium tracking-[0.22em] uppercase text-gray-400">
                    SEC Registered
                  </span>
                </div>
                <div className="hidden sm:block w-1 h-1 bg-gray-300 rounded-full" aria-hidden="true" />
                <div className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined thin-icon text-xl text-hushh-blue" aria-hidden="true">
                    lock
                  </span>
                  <span className="text-[0.7rem] font-medium tracking-[0.22em] uppercase text-gray-400">
                    Bank Level Security
                  </span>
                </div>
              </div>
            </div>

            <div className="relative w-full min-w-0 max-w-4xl">
              <div className="group bg-[#202938] text-white border border-white/10 p-7 sm:p-10 lg:p-12 rounded-2xl relative overflow-hidden shadow-[0_28px_90px_-52px_rgba(15,23,42,0.9)] w-full transition-colors duration-300">
                <div className="absolute inset-x-0 top-0 h-px bg-white/30" aria-hidden="true" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.14),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent_45%)]" aria-hidden="true" />

                <div className="relative z-10 flex flex-col gap-8">
                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between sm:text-left">
                    <div>
                      <span className="text-[10px] font-medium tracking-widest uppercase text-white/62 mb-1 block">
                        Flagship Product
                      </span>
                      <h2
                        className="text-3xl font-medium font-serif sm:text-4xl"
                        style={playfair}
                      >
                        Fund A
                      </h2>
                    </div>
                    <span className="self-start rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-white/72">
                      High Growth
                    </span>
                  </div>

                  <div className="my-1 grid grid-cols-2 gap-5 border-y border-white/10 py-6 text-left sm:grid-cols-4 sm:gap-8">
                    <div className="sm:col-span-2">
                      <span className="text-xs text-white/62 block mb-1">
                        Target Net IRR
                      </span>
                      <span
                        className="text-[40px] font-serif font-light tracking-tighter text-ios-green leading-none sm:text-[48px] lg:text-[56px]"
                        style={playfair}
                      >
                        18-23%
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-xs text-white/62 block mb-1">
                        Inception Year
                      </span>
                      <span
                        className="font-serif text-[36px] leading-none sm:text-[44px]"
                        style={playfair}
                      >
                        2024
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="w-full min-h-[44px] flex items-center justify-between cursor-pointer bg-transparent text-left rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                    onClick={() => onNavigate("/discover-fund-a")}
                    aria-label="View performance details"
                  >
                    <span className="text-xs font-medium tracking-wide uppercase text-hushh-blue">
                      Performance Details
                    </span>
                    <span className="material-symbols-outlined thin-icon text-sm text-hushh-blue group-hover:translate-x-1 transition-transform" aria-hidden="true">
                      arrow_forward
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-auto space-y-10 text-center lg:space-y-14" aria-labelledby="home-advantage-heading">
            <div className="mx-auto flex w-fit px-3 py-1 border border-hushh-blue/15 rounded-full bg-hushh-blue/5">
              <span className="text-[10px] tracking-widest uppercase font-medium text-hushh-blue flex items-center gap-1">
                <span
                  className="relative flex items-center justify-center w-1.5 h-1.5"
                  aria-hidden="true"
                >
                  <span className="absolute inline-flex w-full h-full bg-hushh-blue rounded-full opacity-75 animate-ping" />
                  <span className="relative w-1.5 h-1.5 bg-hushh-blue rounded-full" />
                </span>
                AI-Powered Investing
              </span>
            </div>

            <div className="mx-auto max-w-3xl">
              <p className="text-[10px] uppercase tracking-[0.24em] text-gray-400 mb-3 font-medium">
                Fund Technology
              </p>
              <h2
                id="home-advantage-heading"
                className="text-[2.35rem] font-semibold leading-[1.05] tracking-tight text-black sm:text-[3.3rem] lg:text-[4rem]"
              >
                Designed like a technology product.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-[1.02rem] font-light leading-[1.65] text-gray-500 sm:text-[1.18rem]">
                Institutional analytics, human oversight, and modern fund operations in one investment experience.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4" role="list">
              <div className="bg-[#f5f5f7] p-6 rounded-2xl border border-gray-200/70 flex flex-col items-start justify-between min-h-[160px] text-left sm:min-h-[190px] sm:p-7 transition-colors" role="listitem">
                <span className="material-symbols-outlined thin-icon text-3xl mb-5 text-hushh-blue" aria-hidden="true">
                  neurology
                </span>
                <div>
                  <h2
                    className="text-xl font-semibold tracking-tight mb-2"
                    style={playfair}
                  >
                    AI-Powered
                  </h2>
                  <p className="text-sm text-gray-500 font-light leading-relaxed sm:text-base">
                    Institutional analytics processing millions of signals.
                  </p>
                </div>
              </div>
              <div className="bg-[#f5f5f7] p-6 rounded-2xl border border-gray-200/70 flex flex-col items-start justify-between min-h-[160px] text-left sm:min-h-[190px] sm:p-7 transition-colors" role="listitem">
                <span className="material-symbols-outlined thin-icon text-3xl mb-5 text-ios-dark" aria-hidden="true">
                  supervised_user_circle
                </span>
                <div>
                  <h2
                    className="text-xl font-semibold tracking-tight mb-2"
                    style={playfair}
                  >
                    Human-Led
                  </h2>
                  <p className="text-sm text-gray-500 font-light leading-relaxed sm:text-base">
                    Seasoned oversight ensuring long-term strategic vision.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-10 lg:space-y-12">
              <div>
                <div className="grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-4" role="list">
                  {[
                    {
                      icon: "analytics",
                      color: "text-hushh-blue",
                      bg: "bg-hushh-blue/10",
                      title: "Data Driven",
                      desc: "Decisions based on facts, not emotions.",
                    },
                    {
                      icon: "savings",
                      color: "text-ios-green",
                      bg: "bg-ios-green/10",
                      title: "Low Fees",
                      desc: "More of your returns stay in your pocket.",
                    },
                    {
                      icon: "workspace_premium",
                      color: "text-ios-yellow",
                      bg: "bg-ios-yellow/10",
                      title: "Expert Vetted",
                      desc: "Top-tier financial minds at work.",
                    },
                    {
                      icon: "autorenew",
                      color: "text-hushh-blue",
                      bg: "bg-hushh-blue/10",
                      title: "Automated",
                      desc: "Set it and forget it peace of mind.",
                    },
                  ].map((item) => (
                    <div
                      key={item.icon}
                      className="flex flex-col items-center text-center gap-3"
                      role="listitem"
                    >
                      <div
                        className={`w-11 h-11 rounded-full border border-gray-200/70 flex items-center justify-center ${item.bg}`}
                      >
                        <span
                          className={`material-symbols-outlined thin-icon ${item.color}`}
                          aria-hidden="true"
                        >
                          {item.icon}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-[0.9rem] mb-1">
                          {item.title}
                        </h3>
                        <p className="text-[11px] leading-relaxed text-gray-500 font-light max-w-[160px] mx-auto">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left sm:grid-cols-4" role="list">
                {[
                  {
                    icon: "rocket_launch",
                    color: "text-hushh-blue",
                    title: "High Growth",
                    desc: "Accelerated returns strategy",
                  },
                  {
                    icon: "pie_chart",
                    color: "text-ios-yellow",
                    title: "Diversified",
                    desc: "Multi-sector allocation",
                  },
                  {
                    icon: "trending_up",
                    color: "text-ios-green",
                    title: "Liquid",
                    desc: "Quarterly redemption windows",
                  },
                  {
                    icon: "security",
                    color: "text-hushh-blue",
                    title: "Secure",
                    desc: "Regulated custodian assets",
                  },
                ].map((item) => (
                  <div
                    key={item.icon}
                    className="bg-[#f5f5f7] border border-gray-200/70 p-4 rounded-xl transition-colors sm:p-5"
                    role="listitem"
                  >
                    <span
                      className={`material-symbols-outlined thin-icon ${item.color} mb-2`}
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                    <h3 className="font-medium text-sm leading-tight">{item.title}</h3>
                    <p className="mt-1 text-[10px] leading-relaxed text-gray-500 font-light">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <HushhTechCta
                  onClick={() => onNavigate("/discover-fund-a")}
                  variant={HushhTechCtaVariant.BLACK}
                  className="h-[3.2rem] rounded-full shadow-[0_14px_32px_-24px_rgba(0,0,0,0.7)]"
                >
                  Explore Our Approach
                  <span className="material-symbols-outlined thin-icon text-lg" aria-hidden="true">
                    arrow_right_alt
                  </span>
                </HushhTechCta>
                <HushhTechCta
                  onClick={() => onNavigate("/community")}
                  variant={HushhTechCtaVariant.WHITE}
                  className="h-[3.2rem] rounded-full border-gray-300"
                >
                  Learn More
                </HushhTechCta>
              </div>
            </div>
          </section>

          <footer className="pb-8">
            <p
              className="text-[10px] text-gray-400 text-center leading-relaxed italic max-w-xs sm:max-w-lg lg:max-w-3xl mx-auto font-serif"
              style={playfair}
            >
              Investing involves risk, including possible loss of principal. Past
              performance does not guarantee future results. Hushh Technologies is
              an SEC registered investment advisor.
            </p>
          </footer>
        </div>
      </main>

      <div className="lg:hidden">
        <HushhTechFooter activeTab={HushhFooterTab.HOME} />
      </div>
    </div>
  );
}
