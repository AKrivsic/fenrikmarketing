import type { Metadata } from "next";
import { SampleRequestForm } from "@/components/content-packages/SampleRequestForm/SampleRequestForm";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Content Packages | Fenrik Marketing",
  description:
    "Ready-to-post social content for TikTok, Instagram, Facebook, LinkedIn and YouTube Shorts.",
};

export default function ContentPackagesLandingPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero} id="top">
        <p className={styles.eyebrow}>Content packages</p>
        <h1 className={styles.title}>
          Create a Month of Social Media Content in Days, Not Weeks
        </h1>
        <p className={styles.lead}>
          We turn your website, product or business into ready-to-post content
          for TikTok, Instagram, Facebook, LinkedIn and YouTube Shorts.
        </p>
        <a href="#sample" className={styles.ctaLink}>
          Get a Free Sample
        </a>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>How It Works</h2>
        <ol className={styles.steps}>
          <li>
            Send us your website URL, product description, or business
            description.
          </li>
          <li>We create a sample content package.</li>
          <li>If you like it, order a full content package.</li>
        </ol>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Package Examples</h2>
        <div className={styles.packages}>
          <article className={styles.packageCard}>
            <p className={styles.packageName}>Starter</p>
            <p className={styles.packagePrice}>5 videos — 149 USD</p>
            <p className={styles.packageMeta}>
              TikTok captions, Instagram captions, Facebook posts, LinkedIn
              posts, hashtags.
            </p>
          </article>
          <article className={styles.packageCard}>
            <p className={styles.packageName}>Growth</p>
            <p className={styles.packagePrice}>10 videos — 249 USD</p>
            <p className={styles.packageMeta}>
              TikTok captions, Instagram captions, Facebook posts, LinkedIn
              posts, hashtags.
            </p>
          </article>
          <article className={styles.packageCard}>
            <p className={styles.packageName}>Monthly</p>
            <p className={styles.packagePrice}>20 videos — 399 USD</p>
            <p className={styles.packageMeta}>
              TikTok captions, Instagram captions, Facebook posts, LinkedIn
              posts, hashtags.
            </p>
          </article>
        </div>
      </section>

      <section className={`${styles.section} ${styles.formSection}`} id="sample">
        <h2 className={styles.sectionTitle}>Request Your Free Sample</h2>
        <p className={styles.formIntro}>
          Tell us about your business. No payment required — we will prepare a
          sample package for you to review.
        </p>
        <SampleRequestForm />
      </section>
    </div>
  );
}
