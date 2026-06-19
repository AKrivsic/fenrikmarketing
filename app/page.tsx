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
    "Send us your website and get a free sample content package with ready-to-post videos and social posts.",
};

const PACKAGE_INCLUDES = [
  "AI videos",
  "TikTok captions",
  "Instagram captions",
  "Facebook posts",
  "LinkedIn posts",
  "hashtags",
];

const HERO_PREVIEW_ITEMS = [
  "Short-form video",
  "TikTok caption",
  "Instagram caption",
  "LinkedIn post",
  "Hashtags",
];

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
              <p className={styles.eyebrow}>Content production</p>
              <h1 className={styles.heroTitle}>
                Send Us Your Website. Get Your First Content Package Free.
              </h1>
              <p className={styles.heroLead}>
                We turn your website, SaaS, product or business into ready-to-post
                videos and social posts for TikTok, Instagram, Facebook, LinkedIn
                and YouTube Shorts.
              </p>
              <a href="#sample" className={styles.heroCta}>
                Get My Free Sample
              </a>
            </div>
            <aside className={styles.heroPreview} aria-label="Sample package contents">
              <p className={styles.heroPreviewTitle}>Content Package Preview</p>
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
                  Share your website URL, SaaS, product or business description.
                </span>
              </li>
              <li className={styles.step}>
                <span className={styles.stepTitle}>Receive a Free Sample Package</span>
                <span className={styles.stepText}>
                  We create one ready-to-post content package for your business.
                </span>
              </li>
              <li className={styles.step}>
                <span className={styles.stepTitle}>Order a Full Package</span>
                <span className={styles.stepText}>
                  If you like the sample, order 5, 10 or 20 videos.
                </span>
              </li>
            </ol>
          </section>

          <section className={styles.section} id="whats-included">
            <h2 className={styles.sectionTitle}>See What You Get</h2>
            <p className={styles.sectionLead}>
              One sample package includes a video and platform-ready text for
              multiple channels.
            </p>
            <LandingSampleShowcase sample={sample} />
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Package Examples</h2>
            <p className={styles.sectionLead}>
              Monthly batch packages — each video includes posts and captions for
              every channel.
            </p>
            <div className={styles.packages}>
              <article className={styles.packageCard}>
                <p className={styles.packageName}>Starter</p>
                <p className={styles.packagePrice}>5 videos — 199 USD</p>
                <p className={styles.packageIncludesLabel}>Includes:</p>
                <ul className={styles.packageIncludes}>
                  {PACKAGE_INCLUDES.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </article>
              <article className={styles.packageCard}>
                <p className={styles.packageName}>Growth</p>
                <p className={styles.packagePrice}>10 videos — 349 USD</p>
                <p className={styles.packageIncludesLabel}>Includes:</p>
                <ul className={styles.packageIncludes}>
                  {PACKAGE_INCLUDES.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </article>
              <article className={styles.packageCard}>
                <p className={styles.packageName}>Monthly</p>
                <p className={styles.packagePrice}>20 videos — 599 USD</p>
                <p className={styles.packageIncludesLabel}>Includes:</p>
                <ul className={styles.packageIncludes}>
                  {PACKAGE_INCLUDES.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </article>
            </div>
          </section>

          <section className={`${styles.section} ${styles.formSection}`} id="sample">
            <h2 className={styles.sectionTitle}>Request Your Free Sample</h2>
            <p className={styles.formIntro}>
              Tell us about your business. We will use your website to prepare one
              free sample content package.
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
