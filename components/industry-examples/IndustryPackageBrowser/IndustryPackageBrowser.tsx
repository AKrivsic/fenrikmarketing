"use client";

import { useState } from "react";
import type { IndustryExamplePackage } from "@/lib/industry-examples/types";
import { IndustryPlatformPanel } from "@/components/industry-examples/IndustryPlatformPanel/IndustryPlatformPanel";
import { ExampleVideo } from "./ExampleVideo";
import styles from "./IndustryPackageBrowser.module.css";

interface IndustryPackageBrowserProps {
  packages: IndustryExamplePackage[];
}

export function IndustryPackageBrowser({ packages }: IndustryPackageBrowserProps) {
  const [activeId, setActiveId] = useState(packages[0]?.id ?? "");
  const active =
    packages.find((pkg) => pkg.id === activeId) ?? packages[0] ?? null;

  if (!active) return null;

  return (
    <div className={styles.root}>
      <div
        className={styles.selector}
        role="tablist"
        aria-label="Example packages"
      >
        {packages.map((pkg, index) => {
          const isActive = pkg.id === active.id;
          return (
            <button
              key={pkg.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={
                isActive
                  ? `${styles.selectorBtn} ${styles.selectorBtnActive}`
                  : styles.selectorBtn
              }
              onClick={() => setActiveId(pkg.id)}
            >
              <span className={styles.selectorIndex}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={styles.selectorLabel}>{pkg.selectorLabel}</span>
            </button>
          );
        })}
      </div>

      <article className={styles.packageCard} aria-live="polite">
        <header className={styles.packageHeader}>
          <h3 className={styles.packageTitle}>{active.title}</h3>
          <p className={styles.packageTopic}>{active.topic}</p>
        </header>

        <div className={styles.showcase}>
          <div className={styles.media}>
            <ExampleVideo key={active.id} pkg={active} />
          </div>
          <IndustryPlatformPanel key={active.id} pkg={active} />
        </div>
      </article>
    </div>
  );
}
