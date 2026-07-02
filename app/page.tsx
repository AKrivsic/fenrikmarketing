import type { Metadata } from "next";
import { FenrikStudioLogo } from "@/components/brand/FenrikStudioLogo/FenrikStudioLogo";
import { LandingSampleShowcase } from "@/components/content-packages/LandingSampleShowcase/LandingSampleShowcase";
import { SampleRequestForm } from "@/components/content-packages/SampleRequestForm/SampleRequestForm";
import { getLandingSamplePreview } from "@/lib/api/landing-sample";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Content Packages",
  description:
    "Send your website URL and receive ready-to-publish content packages—short-form video plus captions and posts for each platform. Not software. First package free.",
};

const HERO_PREVIEW_ITEMS = [
  "1 short-form video",
  "TikTok caption",
  "Instagram caption",
  "YouTube title, description & hashtags",
  "Facebook, LinkedIn & X posts",
];

const CONTENT_PLANS = [
  {
    name: "Weekly Content",
    price: "199 USD",
    includes: [
      "5 short-form videos",
      "5 TikTok captions",
      "5 Instagram captions",
      "5 YouTube metadata sets",
      "5 Facebook posts",
      "5 LinkedIn posts",
      "15 X posts",
      "2 Google Business posts",
    ],
  },
  {
    name: "Two Weeks of Content",
    price: "349 USD",
    includes: [
      "10 short-form videos",
      "10 TikTok captions",
      "10 Instagram captions",
      "10 YouTube metadata sets",
      "10 Facebook posts",
      "10 LinkedIn posts",
      "30 X posts",
      "4 Google Business posts",
    ],
  },
  {
    name: "Monthly Content",
    price: "599 USD",
    includes: [
      "20 short-form videos",
      "20 TikTok captions",
      "20 Instagram captions",
      "20 YouTube metadata sets",
      "20 Facebook posts",
      "20 LinkedIn posts",
      "60 X posts",
      "8 Google Business posts",
    ],
  },
] as const;

export default async function HomePage() {
  const sample = await getLandingSamplePreview();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.container}>
          <a href="/" className={styles.logoLink}>
            <FenrikStudioLogo variant="header" />
          </a>
          <nav className={styles.headerNav} aria-label="Landing">
            <a href="#how-it-works" className={styles.headerNavLink}>
              How it works
            </a>
            <a href="#whats-included" className={styles.headerNavLink}>
              What&apos;s included
            </a>
            <a href="#sample" className={styles.headerNavCta}>
              Get free sample
            </a>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.container}>
          <section className={styles.hero} id="top">
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Ready-to-publish content</p>
              <h1 className={styles.heroTitle}>
                Send Us Your Website. Get Your First Content Package Free.
              </h1>
              <p className={styles.heroLead}>
                We read your website and deliver finished Content Packages—each
                with a short-form video and copy for TikTok, Instagram, YouTube,
                Facebook, LinkedIn, X, and Google Business. You publish; we are
                not software and we do not run your accounts.
              </p>
              <a href="#sample" className={styles.heroCta}>
                Get My Free Sample
              </a>
            </div>
            <aside className={styles.heroPreview} aria-label="Sample package contents">
              <p className={styles.heroPreviewTitle}>One Content Package</p>
              <ul className={styles.heroPreviewList}>
                {HERO_PREVIEW_ITEMS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </aside>
          </section>

          <section className={styles.section} id="how-it-works">
            <h2 className={styles.sectionTitle}>How It Works</h2>
            <ol className={styles.steps}>
              <li className={styles.step}>
                <span className={styles.stepTitle}>Send Your Website</span>
                <span className={styles.stepText}>
                  Share your website URL—we use it as the source for your
                  content. No app to learn and no content calendar to manage
                  inside our product.
                </span>
              </li>
              <li className={styles.step}>
                <span className={styles.stepTitle}>Receive a Free Sample Package</span>
                <span className={styles.stepText}>
                  We prepare one complete Content Package: video plus
                  platform-ready text you can copy and publish as-is.
                </span>
              </li>
              <li className={styles.step}>
                <span className={styles.stepTitle}>Order a Full Batch</span>
                <span className={styles.stepText}>
                  If the sample fits, choose Weekly, Two Weeks, or Monthly
                  Content—a batch of packages sized for how long you want to
                  stay covered.
                </span>
              </li>
            </ol>
          </section>

          <section className={styles.section} id="whats-included">
            <h2 className={styles.sectionTitle}>See What You Get</h2>
            <p className={styles.sectionLead}>
              Your free sample is one Content Package—the same deliverable shape
              as paid batches: one video and paste-ready copy per platform.
            </p>
            <LandingSampleShowcase sample={sample} />
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Package Examples</h2>
            <p className={styles.sectionLead}>
              Batches by coverage period. Each short-form video ships with a
              full set of platform copy—ready to publish, built from your site.
            </p>
            <div className={styles.packages}>
              {CONTENT_PLANS.map((plan) => (
                <article key={plan.name} className={styles.packageCard}>
                  <p className={styles.packageName}>{plan.name}</p>
                  <p className={styles.packagePrice}>{plan.price}</p>
                  <p className={styles.packageIncludesLabel}>Includes:</p>
                  <ul className={styles.packageIncludes}>
                    {plan.includes.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
            <p className={styles.sectionLead}>
              Counts differ by platform on purpose—each channel gets the amount
              of content that matches how it is typically used (for example, more
              X posts than Google Business posts in the same period).
            </p>
          </section>

          <section className={`${styles.section} ${styles.formSection}`} id="sample">
            <h2 className={styles.sectionTitle}>Request Your Free Sample</h2>
            <p className={styles.formIntro}>
              Tell us about your business. We use your website to prepare one
              free Content Package—finished video and copy, ready to publish.
            </p>
            <SampleRequestForm />
            <p className={styles.formMicrocopy}>
              No payment required. We only use your website to create a sample
              package.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
