import {
  Compass,
  Sparkles,
  Globe,
  Search,
  Pencil,
  Link as LinkIcon,
  Layers,
  Image as ImageIcon,
  Check,
  Send,
  Bot,
  Wallet,
} from "lucide-react"
import { Section } from "@/components/how-it-works/section"
import { Toc } from "@/components/how-it-works/toc"

const SECTIONS = [
  { id: "overview", title: "Overview" },
  { id: "seo-methodology", title: "The SEO methodology" },
  { id: "site-onboarding", title: "Site onboarding" },
  { id: "keyword-research", title: "Keyword research" },
  { id: "content-generation", title: "Content generation" },
  { id: "internal-linking", title: "Internal linking" },
  { id: "blog-structure", title: "Blog structure rules" },
  { id: "image-optimization", title: "Image optimization" },
  { id: "approval-workflow", title: "Approval workflow" },
  { id: "publishing", title: "Publishing" },
  { id: "autopilot", title: "Autopilot mode" },
  { id: "cost-tracking", title: "Cost tracking" },
]

export default function HowItWorksPage() {
  return (
    <div className="flex gap-10 p-6 max-w-6xl mx-auto">
      <main className="flex-1 min-w-0">
        <header className="mb-6 pb-6 border-b border-border">
          <h1 className="text-3xl font-semibold mb-2">How it works</h1>
          <p className="text-muted-foreground">
            A walkthrough of what this dashboard does end-to-end and the SEO methodology behind it.
            Reading time: ~6 minutes.
          </p>
        </header>

        <Section id="overview" title="Overview" icon={Compass}>
          <p>
            This dashboard runs the full SEO blog pipeline for a portfolio of websites — from
            keyword research through to live publication — without anyone having to babysit it.
            You connect a site, the system profiles it, finds the right keywords, writes the
            posts, generates the images, and publishes to WordPress or any site that implements
            our publishing API contract.
          </p>
          <p>
            It&apos;s built for a small team running content ops across 10–20+ sites. Every step that
            used to live in Make.com scenarios and Airtable tabs is now one server action away,
            with cost attribution, job activity tracking, and a per-site approval queue.
          </p>
        </Section>

        <Section id="seo-methodology" title="The SEO methodology" icon={Sparkles}>
          <p>
            Most &quot;AI blog&quot; tools spit out keyword-stuffed wallpaper that ranks for nothing. We
            do four things differently, all of which line up with how Google&apos;s algorithms
            actually evaluate content:
          </p>
          <p>
            <strong>1. Intent-aware keyword selection.</strong> Every discovered keyword gets
            classified by search intent (informational / transactional / commercial /
            navigational) and grouped into topic clusters. The AI picks 15 keywords per site
            that balance quick wins against authority builds and avoid cannibalising each other.
          </p>
          <p>
            <strong>2. Direct-answer-first structure.</strong> The opening paragraph of every
            post directly answers the search query in 2–3 sentences. No &quot;in this article we&apos;ll
            cover…&quot; filler. Google rewards posts that resolve the query fast.
          </p>
          <p>
            <strong>3. Internal linking for link equity.</strong> Every new post weaves 2–4
            contextual internal links to existing posts on the same site. Anchor text is natural
            phrasing pulled from the body, never the target&apos;s exact title. This distributes
            ranking authority across the site rather than letting it pool on the homepage.
          </p>
          <p>
            <strong>4. Topic clusters over keyword spam.</strong> The keyword scorer groups
            related searches into clusters so each post owns a topic, not a keyword. Pillars
            and supporting posts emerge naturally without manual content mapping.
          </p>
        </Section>

        <Section
          id="site-onboarding"
          title="Site onboarding"
          icon={Globe}
          stack="Jina Reader · Claude"
        >
          <p>
            When you add a new site, the dashboard crawls the homepage via Jina Reader (which
            renders JavaScript-heavy SPAs before extracting content), then sends the extracted
            content to Claude for SEO profiling. The AI returns a structured profile: niche,
            target audience, writing tone, topic areas, and seed keywords.
          </p>
          <p>
            That profile is the foundation every downstream prompt builds on. The keyword
            scorer uses it to decide what&apos;s relevant. The blog generator uses it to set tone
            and frame topics. If the profile is wrong, everything downstream is wrong — so it&apos;s
            editable from the site detail page anytime.
          </p>
          <p>
            The site&apos;s logo also gets auto-extracted from the homepage HTML during onboarding
            (preferred over favicon services) and cached. Manual override is available in the
            edit page.
          </p>
        </Section>

        <Section
          id="keyword-research"
          title="Keyword research"
          icon={Search}
          stack="DataForSEO · Claude Sonnet"
        >
          <p>
            Research runs in four progressive steps so you can watch keywords stream in:
          </p>
          <p>
            <strong>1. Seed discovery.</strong> The site&apos;s seed keywords (from onboarding) get
            expanded via DataForSEO&apos;s &quot;Keywords For Keywords&quot; endpoint. Returns related searches
            with volume, CPC, and competition data.
          </p>
          <p>
            <strong>2. Site discovery.</strong> DataForSEO&apos;s &quot;Keywords For Site&quot; endpoint
            returns keywords the site is theoretically relevant for based on its domain. We
            cap each step at 50 keywords by volume to skip low-traffic noise.
          </p>
          <p>
            <strong>3. AI relevance scoring.</strong> Claude scores each keyword 0–1 for
            relevance to the site&apos;s profile, classifies search intent, and assigns a topic
            cluster. Keywords below the cutoff get pruned automatically.
          </p>
          <p>
            <strong>4. AI keyword selection.</strong> Claude reviews the scored set and
            auto-approves the best ~15 based on topic coverage, quick wins, intent mix, and
            cannibalisation avoidance. Auto-approved keywords are flagged with a sparkle badge
            in the table.
          </p>
        </Section>

        <Section
          id="content-generation"
          title="Content generation"
          icon={Pencil}
          stack="Claude Sonnet · StealthGPT · Gemini"
        >
          <p>
            Click &quot;Generate Post&quot; against an approved keyword and the orchestrator runs the
            generation pipeline. Claude picks a primary keyword plus 1–2 thematically related
            secondary keywords from the approved set, then writes a 1000–1500 word blog post
            in markdown with proper heading hierarchy and image placement markers.
          </p>
          <p>
            The draft passes through StealthGPT for humanisation. Before the call, target
            keywords are swapped out for placeholders so the rephraser can&apos;t mangle them; after,
            the placeholders are restored. This preserves the keyword density that drives
            rankings while removing the AI fingerprint patterns most detectors look for.
          </p>
          <p>
            Gemini (Nano Banana 2 — gemini-3.1-flash-image-preview) generates 4 images: one
            featured plus three section images. Each image gets piped through sharp for
            optimisation before landing in Supabase Storage and the post body.
          </p>
        </Section>

        <Section
          id="internal-linking"
          title="Internal linking"
          icon={LinkIcon}
          stack="Claude · external_posts cache"
        >
          <p>
            Internal links matter because they distribute ranking authority across a site
            instead of letting it pool on the homepage. They also keep readers engaged by
            offering contextual jumps to related posts.
          </p>
          <p>
            Every connected site has a cached list of its published posts (the
            external_posts table). The cache is seeded when you connect Publishing, appended
            automatically every time this app publishes a new post, and can be manually
            re-synced from the Publishing tab if you publish anything outside the app.
          </p>
          <p>
            During generation, the cached list is passed into Claude alongside the article
            draft. The prompt instructs Claude to find natural phrases already in the body
            that semantically match a target post, then wrap them as Markdown links. Aim is
            2–4 links per post, distributed across the body — never clustered, never forced.
          </p>
        </Section>

        <Section id="blog-structure" title="Blog structure rules" icon={Layers}>
          <p>
            Every generated post follows the same structural contract, enforced via the
            generation prompt:
          </p>
          <p>
            <strong>Direct answer first.</strong> The opening paragraph (right after the H1,
            before any H2) directly answers the search question implied by the keyword in 2–3
            sentences. No throat-clearing.
          </p>
          <p>
            <strong>Sections via H2s.</strong> Each main idea gets its own H2. H3s subdivide
            an H2 only when needed. H4 and deeper are banned — they bloat outline parsers and
            usually signal poor structure.
          </p>
          <p>
            <strong>&quot;Key takeaways&quot; final section.</strong> The last section is always an H2
            titled &quot;Key takeaways&quot; followed by 4–7 bullet points summarising the post.
            Featured snippets and AI summaries scrape these heavily, and human readers use them
            to decide whether to scroll back up.
          </p>
        </Section>

        <Section
          id="image-optimization"
          title="Image optimization"
          icon={ImageIcon}
          stack="sharp · WebP"
        >
          <p>
            Gemini returns uncompressed PNGs that can hit 2MB each. With 4 images per post,
            that&apos;s 8MB of image weight pushed to the destination site — bad for page speed,
            bad for Core Web Vitals, bad for hosting costs.
          </p>
          <p>
            Every image flows through sharp before upload: resized down to a 1200×1200 max
            (preserving aspect ratio, never upscaling), converted to WebP at quality 80, and
            stripped of EXIF/colour profile metadata. Result: 75–90% smaller files at zero
            visible quality loss.
          </p>
          <p>
            If sharp ever throws (corrupt input, unsupported format), the system falls back to
            uploading the raw bytes. Image generation can never fail because of optimisation.
          </p>
        </Section>

        <Section id="approval-workflow" title="Approval workflow" icon={Check}>
          <p>
            Generated posts land in the content queue with status &quot;draft&quot;. Clicking into a post
            opens a side-by-side markdown editor and live preview where you can tweak copy,
            adjust images, or rewrite sections. The cost panel on the post detail page shows
            exactly what that post cost to produce.
          </p>
          <p>
            Approve marks the post ready to publish. Reject with review notes sends it back to
            the draft state with feedback. Both actions are tracked with approvedBy and
            approvedAt timestamps.
          </p>
          <p>
            Sites can opt into &quot;auto-publish on approval&quot; — approving a post immediately queues
            a publish job. Useful when you trust the pipeline and want to skim-and-ship.
          </p>
        </Section>

        <Section
          id="publishing"
          title="Publishing"
          icon={Send}
          stack="WordPress REST · Standard API"
        >
          <p>
            Two publishing platforms are supported. <strong>WordPress</strong> uses the REST
            API with application passwords (encrypted at rest with AES-256-GCM). The dashboard
            syncs categories and tags during connection so the AI taxonomy classifier has
            something to pick from.
          </p>
          <p>
            <strong>Standard API</strong> is our universal contract for non-WP sites — Manus
            sites, Claude-built Vercel sites, anything that implements the endpoints in
            docs/manus.md. Single x-api-key header for auth. Publish, unpublish, fetch
            metadata (categories, tags, site context), fetch existing posts, upload media — all
            covered. New sites copy-paste the prompt at the bottom of docs/manus.md into
            their AI builder of choice.
          </p>
          <p>
            On publish, Claude classifies the post into the right category and picks 2–4 tags
            from the site&apos;s synced taxonomy. The featured image is uploaded to the destination
            (so the site owns the asset, not Supabase Storage), then the markdown is converted
            to HTML and the article is created. Published posts get their canonical URL
            and external ID stored back on the local Post row.
          </p>
        </Section>

        <Section
          id="autopilot"
          title="Autopilot mode"
          icon={Bot}
          stack="Vercel cron · job queue"
        >
          <p>
            Each site has an autopilot toggle. When on, the weekly Vercel cron job (Monday 9am
            UTC) queues a generate-post job for every autopilot-enabled site that has approved
            keywords available. The queue processor self-chains — after one job completes, it
            fires off the next pending job — so the work flows through without needing
            multiple long-running cron invocations.
          </p>
          <p>
            If &quot;auto-publish on approval&quot; is also on, the generated posts auto-publish too.
            End result: a site can be set up once and produce a steady stream of new content
            with zero manual intervention.
          </p>
          <p>
            The Activity page shows in-flight jobs with elapsed time and current step, the
            last 30 completed/failed jobs, plus retry and cancel buttons. A self-healing
            stale-job reaper marks anything stuck for &gt;10 minutes as failed so the queue
            never blocks.
          </p>
        </Section>

        <Section
          id="cost-tracking"
          title="Cost tracking"
          icon={Wallet}
          stack="usage_events log"
        >
          <p>
            Every paid API call writes a row to the usage_events log: provider, model,
            operation, token / image / word counts, cost in USD and GBP (frozen at the moment
            of the call using that day&apos;s exchange rate), and attribution to the site, post,
            research run, or job that triggered it.
          </p>
          <p>
            Three views read off that single log. The <strong>per-blog cost panel</strong> on
            each post detail shows the breakdown by operation (generation / humanisation /
            images / classification) plus an expandable per-call log for diagnostics. The{" "}
            <strong>per-site Costs tab</strong> shows total spend, this month, average cost
            per published post, spend split, trend chart, and an itemised breakdown of every
            blog, research run, and onboarding event. The{" "}
            <strong>global Costs page</strong> adds site comparison and per-provider spend
            breakdown.
          </p>
          <p>
            Direct SDK imports outside lib/usage/ are blocked by ESLint — you can&apos;t add a
            new Claude or Gemini call without it being logged. Cost tracking is enforced by
            structure, not discipline.
          </p>
        </Section>
      </main>

      <Toc items={SECTIONS} />
    </div>
  )
}
