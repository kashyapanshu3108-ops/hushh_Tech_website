import HushhTechHeader from "./hushh-tech-header/HushhTechHeader";

const playfair = { fontFamily: "'Playfair Display', serif" };

const philosophyPillars = [
  {
    icon: "database",
    title: "Data as an Asset",
    description:
      "We treat data as a disciplined input for investor outcomes, not as a product to be extracted.",
  },
  {
    icon: "show_chart",
    title: "Volatility With Rules",
    description:
      "Every strategy is filtered through liquidity, risk limits, and a clear view of downside exposure.",
  },
  {
    icon: "psychology",
    title: "Human-Led AI",
    description:
      "Models help us see faster, but human judgment sets the guardrails and owns the decision.",
  },
];

const operatingPrinciples = [
  "Prefer durable free-cash-flow businesses over narrative-driven trades.",
  "Use automation to remove emotional timing, not to remove accountability.",
  "Keep privacy, transparency, and investor trust as first-class design constraints.",
  "Build for compounding resilience across market cycles.",
];

export default function Philosophy() {
  return (
    <div className="min-h-screen bg-white antialiased text-gray-900 selection:bg-hushh-blue selection:text-white">
      <HushhTechHeader />

      <main
        id="main-content"
        className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-24"
      >
        <section className="max-w-3xl" aria-labelledby="philosophy-heading">
          <p className="text-[10px] uppercase tracking-[0.22em] text-hushh-blue font-semibold mb-4">
            Investment philosophy
          </p>
          <h1
            id="philosophy-heading"
            className="text-[2.75rem] leading-[1.08] font-normal text-black tracking-tight sm:text-[3.25rem] lg:text-[4rem]"
            style={playfair}
          >
            Data. Volatility.{" "}
            <span className="text-gray-400 italic font-light">Alpha.</span>
          </h1>
          <p className="text-gray-500 text-sm font-light mt-5 leading-relaxed max-w-2xl sm:text-base">
            Hushh Technologies blends rigorous research, risk-aware execution,
            and AI-assisted analysis to build strategies that can compound with
            patience instead of chasing every market spike.
          </p>
        </section>

        <section
          className="grid grid-cols-1 gap-4 mt-12 md:grid-cols-3"
          aria-label="Philosophy pillars"
        >
          {philosophyPillars.map((pillar) => (
            <article
              key={pillar.title}
              className="rounded-2xl border border-gray-200/70 bg-[#F5F5F7] p-6 min-h-[220px] transition-colors hover:border-hushh-blue/30"
            >
              <div className="w-11 h-11 rounded-full border border-hushh-blue/15 bg-white flex items-center justify-center mb-6">
                <span
                  className="material-symbols-outlined thin-icon text-hushh-blue"
                  aria-hidden="true"
                >
                  {pillar.icon}
                </span>
              </div>
              <h2
                className="text-2xl font-normal text-black mb-3"
                style={playfair}
              >
                {pillar.title}
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed font-light">
                {pillar.description}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-14 rounded-2xl border border-gray-200/70 bg-white p-6 sm:p-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-semibold mb-5">
            Operating principles
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {operatingPrinciples.map((principle) => (
              <div
                key={principle}
                className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-4"
              >
                <span
                  className="material-symbols-outlined thin-icon text-ios-green text-lg mt-0.5"
                  aria-hidden="true"
                >
                  check_circle
                </span>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {principle}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
