import Link from "next/link";
import { FenrikStudioLogo } from "@/components/brand/FenrikStudioLogo/FenrikStudioLogo";
import { SampleRequestForm } from "@/components/content-packages/SampleRequestForm/SampleRequestForm";
import { IndustryPackageBrowser } from "@/components/industry-examples/IndustryPackageBrowser/IndustryPackageBrowser";
import type { IndustryExampleData } from "@/lib/industry-examples/types";
import styles from "./IndustryExamplePage.module.css";

interface IndustryExamplePageProps {
  data: IndustryExampleData;
}

export function IndustryExamplePage({ data }: IndustryExamplePageProps) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.container}>
          <Link href="/" className={styles.logoLink}>
            <FenrikStudioLogo variant="header" />
          </Link>
          <nav className={styles.headerNav} aria-label="Example page">
            <a href="#examples" className={styles.headerNavLink}>
              Examples
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
              <p className={styles.eyebrow}>{data.eyebrow}</p>
              <h1 className={styles.heroTitle}>{data.headline}</h1>
              <p className={styles.heroLead}>{data.description}</p>
              <p className={styles.disclaimer}>{data.disclaimer}</p>
              <a href="#examples" className={styles.heroCta}>
                Explore the examples
              </a>
            </div>
            <aside className={styles.heroPreview} aria-label="What these examples include">
              <p className={styles.heroPreviewTitle}>In these examples</p>
              <ul className={styles.heroPreviewList}>
                {data.heroSupportLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </aside>
          </section>

          <section className={styles.section} id="examples">
            <h2 className={styles.sectionTitle}>
              {data.industryName} Content Packages
            </h2>
            <p className={styles.sectionLead}>
              Browse each example package — one short-form video with
              ready-to-publish copy for Instagram, TikTok, YouTube Shorts,
              Facebook, LinkedIn, and X.
            </p>
            <IndustryPackageBrowser packages={data.packages} />
          </section>

          <section className={styles.section} id="how">
            <h2 className={styles.sectionTitle}>How it works</h2>
            <ol className={styles.steps}>
              <li className={styles.step}>
                <span className={styles.stepTitle}>You send us your website</span>
                <span className={styles.stepText}>
                  We use it as the source for your content.
                </span>
              </li>
              <li className={styles.step}>
                <span className={styles.stepTitle}>We prepare the content</span>
                <span className={styles.stepText}>
                  Finished video and platform-ready copy, built for your
                  business.
                </span>
              </li>
              <li className={styles.step}>
                <span className={styles.stepTitle}>You review everything</span>
                <span className={styles.stepText}>
                  It arrives ready to publish — you post it yourself.
                </span>
              </li>
            </ol>
          </section>

          <section
            className={`${styles.section} ${styles.formSection}`}
            id="sample"
          >
            <h2 className={styles.sectionTitle}>
              Want to see what we&apos;d create for your business?
            </h2>
            <p className={styles.formIntro}>
              Send us your website and we&apos;ll prepare one complete Content
              Package for your business free. No payment required.
            </p>
            <SampleRequestForm />
            <p className={styles.formMicrocopy}>
              No payment required. We only use your website to create a sample
              package.
            </p>
          </section>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <p className={styles.footerText}>
            Contact:{" "}
            <a href="mailto:support@fenrik.studio" className={styles.footerLink}>
              support@fenrik.studio
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
