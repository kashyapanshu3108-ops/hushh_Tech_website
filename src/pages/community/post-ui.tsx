/**
 * Community Post — UI / Presentation (Revamped)
 * Apple iOS colors, Playfair Display headings, proper English.
 * Matches Home + Fund A design language.
 * Logic stays in post-logic.ts — zero data here.
 */
import ReactMarkdown from "react-markdown";
import { useCommunityPostLogic } from "./post-logic";
import type { CommunityMediaItem } from "../../services/communityContent";
import HushhTechBackHeader from "../../components/hushh-tech-back-header/HushhTechBackHeader";
import HushhTechFooter, {
  HushhFooterTab,
} from "../../components/hushh-tech-footer/HushhTechFooter";

/* ── Playfair heading style ── */
const playfair = { fontFamily: "'Playfair Display', serif" };
const richContentClassName = [
  "prose prose-neutral max-w-none prose-headings:font-serif prose-a:text-hushh-blue",
  "min-w-0 overflow-x-hidden break-words",
  "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl",
  "[&_video]:max-w-full [&_video]:h-auto",
  "[&_iframe]:block [&_iframe]:w-full [&_iframe]:max-w-full [&_iframe]:min-w-0",
  "[&_table]:block [&_table]:w-full [&_table]:max-w-full [&_table]:overflow-x-auto",
  "[&_pre]:max-w-full [&_pre]:overflow-x-auto",
  "[&_code]:break-words [&_a]:break-words",
].join(" ");

function DocumentMediaPages({
  mediaItems,
  title,
}: {
  mediaItems: CommunityMediaItem[];
  title: string;
}) {
  return (
    <article className="mx-auto w-full max-w-[960px] min-w-0 space-y-4">
      {mediaItems.map((item, index) => (
        <figure
          key={`${item.url}-${index}`}
          className="w-full min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
        >
          {item.type === "video" ? (
            <video
              src={item.url}
              controls
              className="block w-full max-w-full h-auto bg-black"
              aria-label={item.alt || `${title} video ${index + 1}`}
            />
          ) : (
            <img
              src={item.url}
              alt={item.alt || `${title} page ${index + 1}`}
              className="block w-full max-w-full h-auto object-contain"
              loading="lazy"
              decoding="async"
            />
          )}
        </figure>
      ))}
    </article>
  );
}

export default function CommunityPostPage() {
  const { post, legacyPost, loading, handleBack } = useCommunityPostLogic();

  /* loading state */
  if (loading) {
    return (
      <div
        className="bg-white min-h-screen flex items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <div
          className="w-8 h-8 border-2 border-gray-200 border-t-hushh-blue rounded-full animate-spin"
          aria-hidden="true"
        />
        <span className="sr-only">Loading community article</span>
      </div>
    );
  }

  if (!post) return null;

  const LegacyPostComponent =
    legacyPost && typeof legacyPost.Component !== "string"
      ? legacyPost.Component
      : null;
  const legacyPostLayoutClassName =
    post.sourceKind === "deck"
      ? "flex-1 w-full pb-24"
      : "flex-1 max-w-[900px] mx-auto w-full px-4 md:px-8 py-6 md:py-10 pb-32";
  const documentMediaItems = post.mediaItems?.filter((item) => item.url) || [];

  /* ── Document Post ── */
  if (post.sourceKind === "document" && post.assetUrl) {
    return (
      <div className="bg-white text-gray-900 min-h-screen antialiased flex flex-col selection:bg-hushh-blue selection:text-white">
        <HushhTechBackHeader
          onBackClick={handleBack}
          rightType="hamburger"
        />

        <main className="flex-1 w-full min-w-0 max-w-full overflow-x-hidden px-3 sm:px-4 md:px-8 py-4 pb-32">
          <h1
            className="sr-only"
            style={playfair}
          >
            {post.title}
          </h1>
          {documentMediaItems.length > 0 ? (
            <DocumentMediaPages
              mediaItems={documentMediaItems}
              title={post.title}
            />
          ) : null}
          <section className={documentMediaItems.length > 0 ? "mt-8" : ""}>
            <div className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <iframe
                src={`${post.assetUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
                className="block w-full min-w-0 max-w-full h-[calc(100dvh-120px)] min-h-[70dvh] border-0 bg-white"
                title={post.title}
              />
            </div>
          </section>
        </main>

        <HushhTechFooter activeTab={HushhFooterTab.COMMUNITY} />
      </div>
    );
  }

  if (
    LegacyPostComponent &&
    (post.sourceKind === "legacy" ||
      post.sourceKind === "deck" ||
      !post.bodyMarkdown)
  ) {
    return (
      <div className="bg-white text-gray-900 min-h-screen antialiased flex flex-col selection:bg-hushh-blue selection:text-white">
        <HushhTechBackHeader
          onBackClick={handleBack}
          rightType="hamburger"
        />

        <main className={legacyPostLayoutClassName}>
          <LegacyPostComponent />
        </main>

        <HushhTechFooter activeTab={HushhFooterTab.COMMUNITY} />
      </div>
    );
  }

  if (post.bodyMarkdown || post.bodyHtml || post.sourceKind === "deck") {
    return (
      <div className="bg-white text-gray-900 min-h-screen antialiased flex flex-col selection:bg-hushh-blue selection:text-white">
        <HushhTechBackHeader
          onBackClick={handleBack}
          rightType="hamburger"
        />

        <main className="flex-1 max-w-[900px] mx-auto w-full px-4 md:px-8 py-8 md:py-12 pb-32">
          <p className="text-[10px] tracking-[0.15em] uppercase font-medium text-hushh-blue/70 mb-3">
            {post.category}
          </p>
          <h1
            className="text-[2.35rem] md:text-[3.1rem] leading-[1.1] font-normal text-black tracking-tight font-serif mb-4"
            style={playfair}
          >
            {post.title}
          </h1>
          <p className="text-[14px] text-gray-500 font-light leading-relaxed mb-10 max-w-2xl">
            {post.description}
          </p>

          {post.bodyHtml ? (
            <article
              className={richContentClassName}
              dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
            />
          ) : (
            <article className={richContentClassName}>
              <ReactMarkdown>{post.bodyMarkdown || ""}</ReactMarkdown>
            </article>
          )}
        </main>

        <HushhTechFooter activeTab={HushhFooterTab.COMMUNITY} />
      </div>
    );
  }

  if (!LegacyPostComponent) {
    return (
      <div className="bg-white text-gray-900 min-h-screen antialiased flex flex-col selection:bg-hushh-blue selection:text-white">
        <HushhTechBackHeader
          onBackClick={handleBack}
          rightType="hamburger"
        />

        <main
          className="flex-1 max-w-[900px] mx-auto w-full px-4 md:px-8 py-8 md:py-12 pb-32"
          data-testid="community-post-missing-content"
        >
          <p className="text-[10px] tracking-[0.15em] uppercase font-medium text-hushh-blue/70 mb-3">
            {post.category}
          </p>
          <h1
            className="text-[2.35rem] md:text-[3.1rem] leading-[1.1] font-normal text-black tracking-tight font-serif mb-4"
            style={playfair}
          >
            {post.title}
          </h1>
          <article className={richContentClassName}>
            <p>{post.description || "Article details are currently unavailable."}</p>
          </article>
        </main>

        <HushhTechFooter activeTab={HushhFooterTab.COMMUNITY} />
      </div>
    );
  }

  return (
    <div className="bg-white text-gray-900 min-h-screen antialiased flex flex-col selection:bg-hushh-blue selection:text-white">
      <HushhTechBackHeader
        onBackClick={handleBack}
        rightType="hamburger"
      />

      <main className={legacyPostLayoutClassName}>
        <LegacyPostComponent />
      </main>

      <HushhTechFooter activeTab={HushhFooterTab.COMMUNITY} />
    </div>
  );
}
