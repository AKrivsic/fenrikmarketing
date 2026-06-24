"use client";

import { useState } from "react";
import type { RunCoverageReport } from "@/lib/production-runs/runCoverage";
import styles from "./RunInsightsPanel.module.css";

interface RunInsightsPanelProps {
  insights: RunCoverageReport;
}

const FUNNEL_LABELS: Record<string, string> = {
  awareness: "Awareness",
  problem_aware: "Problem aware",
  solution_aware: "Solution aware",
  conversion: "Conversion",
};

function SummaryBadge({ label }: { label: string }) {
  return <span className={styles.summaryBadge}>{label}</span>;
}

export function RunInsightsPanel({ insights }: RunInsightsPanelProps) {
  const [open, setOpen] = useState(false);
  const { summary } = insights;

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.caret} aria-hidden="true">
          {open ? "▼" : "▶"}
        </span>
        <span className={styles.title}>Run Insights</span>
      </button>

      {open ? (
        <div className={styles.body}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Summary</h3>
            <div className={styles.summaryRow}>
              <span>
                Funnel: <SummaryBadge label={summary.funnel} />
              </span>
              <span>
                Topics: <SummaryBadge label={summary.topics} />
              </span>
              <span>
                Strengths: <SummaryBadge label={summary.strengths} />
              </span>
              <span>
                Audience: <SummaryBadge label={summary.audience} />
              </span>
              <span>
                Scenarios: <SummaryBadge label={summary.scenarios} />
              </span>
            </div>
          </section>

          {insights.warnings.length > 0 ? (
            <ul className={styles.warnings}>
              {insights.warnings.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : null}

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Funnel coverage</h3>
            <table className={styles.table}>
              <tbody>
                {Object.entries(insights.funnel.byStage).map(([stage, count]) => (
                  <tr key={stage}>
                    <th scope="row">{FUNNEL_LABELS[stage] ?? stage}</th>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={styles.meta}>
              Total packages: {insights.funnel.totalPackages}
            </p>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Creative mode coverage</h3>
            {!insights.creativeModes.available ? (
              <p className={styles.muted}>Not available</p>
            ) : (
              <>
                <table className={styles.table}>
                  <tbody>
                    {Object.entries(insights.creativeModes.byMode)
                      .sort((a, b) => b[1] - a[1])
                      .map(([mode, count]) => (
                        <tr key={mode}>
                          <th scope="row">{mode}</th>
                          <td>{count}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {insights.creativeModes.dominantMode !== null &&
                insights.creativeModes.dominantShare !== null ? (
                  <p className={styles.meta}>
                    Dominant: {insights.creativeModes.dominantMode} (
                    {Math.round(insights.creativeModes.dominantShare * 100)}%)
                  </p>
                ) : null}
              </>
            )}
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Topic / angle coverage</h3>
            <p className={styles.meta}>
              Packages: {insights.topics.totalPackages} · Unique topics:{" "}
              {insights.topics.uniqueTopics} · Unique angles:{" "}
              {insights.topics.uniqueAngles}
            </p>
            {insights.topics.repeatedTopics.length > 0 ? (
              <>
                <p className={styles.subLabel}>Repeated topics</p>
                <ul className={styles.list}>
                  {insights.topics.repeatedTopics.map((entry) => (
                    <li key={entry.text}>
                      {entry.text} <span className={styles.count}>×{entry.count}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {insights.topics.repeatedAngles.length > 0 ? (
              <>
                <p className={styles.subLabel}>Repeated angles</p>
                <ul className={styles.list}>
                  {insights.topics.repeatedAngles.map((entry) => (
                    <li key={entry.text}>
                      {entry.text} <span className={styles.count}>×{entry.count}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Pain point coverage</h3>
            {insights.painPoints.total === 0 ? (
              <p className={styles.muted}>No pain points configured on project.</p>
            ) : (
              <>
                <p className={styles.meta}>
                  Used: {insights.painPoints.usedCount} / {insights.painPoints.total}
                  {insights.painPoints.estimated ? (
                    <span className={styles.estimated}>
                      {" "}
                      · Estimated from generated copy.
                    </span>
                  ) : null}
                </p>
                {insights.painPoints.used.length > 0 ? (
                  <>
                    <p className={styles.subLabel}>Used</p>
                    <ul className={styles.list}>
                      {insights.painPoints.used.map((entry) => (
                        <li key={entry.text}>
                          {entry.text}
                          {entry.explicit ? (
                            <span className={styles.tag}>explicit</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {insights.painPoints.unused.length > 0 ? (
                  <>
                    <p className={styles.subLabel}>Unused</p>
                    <ul className={styles.listMuted}>
                      {insights.painPoints.unused.map((text) => (
                        <li key={text}>{text}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </>
            )}
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Strength coverage</h3>
            {insights.strengths.total === 0 ? (
              <p className={styles.muted}>No product strengths configured.</p>
            ) : (
              <>
                <p className={styles.meta}>
                  Used: {insights.strengths.usedCount} / {insights.strengths.total}
                  <span className={styles.estimated}>
                    {" "}
                    · Estimated from generated copy.
                  </span>
                </p>
                {insights.strengths.used.length > 0 ? (
                  <>
                    <p className={styles.subLabel}>Used</p>
                    <ul className={styles.list}>
                      {insights.strengths.used.map((entry) => (
                        <li key={entry.text}>{entry.text}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {insights.strengths.unused.length > 0 ? (
                  <>
                    <p className={styles.subLabel}>Unused</p>
                    <ul className={styles.listMuted}>
                      {insights.strengths.unused.map((text) => (
                        <li key={text}>{text}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </>
            )}
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Audience coverage</h3>
            {!insights.audience.available ? (
              <p className={styles.muted}>Audience coverage not available.</p>
            ) : (
              <>
                <p className={styles.meta}>
                  Used: {insights.audience.usedCount} / {insights.audience.total}
                  <span className={styles.estimated}>
                    {" "}
                    · Estimated from generated copy.
                  </span>
                </p>
                {insights.audience.used.length > 0 ? (
                  <>
                    <p className={styles.subLabel}>Used</p>
                    <ul className={styles.list}>
                      {insights.audience.used.map((entry) => (
                        <li key={entry.text}>{entry.text}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {insights.audience.unused.length > 0 ? (
                  <>
                    <p className={styles.subLabel}>Unused</p>
                    <ul className={styles.listMuted}>
                      {insights.audience.unused.map((text) => (
                        <li key={text}>{text}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </>
            )}
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Scenario repetition</h3>
            {insights.scenarios.repeated.length === 0 ? (
              <p className={styles.muted}>No repeated scenarios detected.</p>
            ) : (
              <ul className={styles.list}>
                {insights.scenarios.repeated.map((entry) => (
                  <li key={entry.text}>
                    {entry.text}{" "}
                    <span className={styles.count}>×{entry.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
