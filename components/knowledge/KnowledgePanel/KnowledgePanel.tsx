"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { regenerateProjectKnowledge } from "@/app/projects/[id]/knowledge/actions";
import {
  KnowledgeCard,
  type KnowledgeCardField,
  type ProofStatementView,
} from "@/components/knowledge/KnowledgeCard/KnowledgeCard";
import {
  isKnowledgeReady,
  type KnowledgeCardKey,
  type ProjectKnowledge,
} from "@/lib/knowledge/types";
import styles from "./KnowledgePanel.module.css";

interface KnowledgePanelProps {
  projectId: string;
  knowledge: ProjectKnowledge;
  // Maps source asset id -> title, used to label asset-derived proof. Assets
  // that no longer exist simply render without a source label.
  assetTitlesById?: Record<string, string>;
}

interface CardConfig {
  key: KnowledgeCardKey;
  title: string;
  fields: { key: string; label: string }[];
}

// Card layout config. Field keys MUST match CARD_FIELDS in lib/knowledge/types.
const CARDS: CardConfig[] = [
  {
    key: "product",
    title: "Product",
    fields: [
      { key: "product_is", label: "Product is" },
      { key: "product_is_not", label: "Product is not" },
      { key: "product_strengths", label: "Strengths" },
    ],
  },
  {
    key: "customer",
    title: "Customer",
    fields: [
      { key: "target_audience", label: "Target audience" },
      { key: "pain_points", label: "Pain points" },
    ],
  },
  {
    key: "voice",
    title: "Voice",
    fields: [
      { key: "tone", label: "Tone" },
      { key: "forbidden_claims", label: "Forbidden claims" },
    ],
  },
  {
    key: "proof",
    title: "Proof",
    fields: [{ key: "statements", label: "Proof statements" }],
  },
];

export function KnowledgePanel({
  projectId,
  knowledge,
  assetTitlesById = {},
}: KnowledgePanelProps) {
  const router = useRouter();
  const [isRegenerating, startRegenerate] = useTransition();
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const ready = isKnowledgeReady(knowledge);
  const projectHref = `/projects/${projectId}`;

  const showFailedBanner =
    !!knowledge.source_url && knowledge.extraction_status === "failed";

  function handleRegenerate(): void {
    setRegenerateError(null);
    startRegenerate(async () => {
      const result = await regenerateProjectKnowledge(projectId);
      if (!result.ok) {
        setRegenerateError(result.error);
        return;
      }
      router.refresh();
    });
  }

  // Asset-derived proof statements rendered read-only on the Proof card.
  const proofStatements: ProofStatementView[] =
    knowledge.cards.proof.asset_statements.map((statement) => ({
      text: statement.text,
      confidence: statement.confidence,
      sourceLabel: statement.source_asset_id
        ? (assetTitlesById[statement.source_asset_id] ?? null)
        : null,
    }));

  function handleApproved(nowReady: boolean) {
    // Task 7: once the last card is approved, go to the project detail.
    if (nowReady) {
      router.push(projectHref);
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.regenerateButton}
          onClick={handleRegenerate}
          disabled={isRegenerating || !knowledge.source_url}
        >
          {isRegenerating ? "Regenerating…" : "Regenerate Knowledge"}
        </button>
        {!knowledge.source_url ? (
          <span className={styles.toolbarHint}>No source URL stored.</span>
        ) : null}
      </div>

      {regenerateError ? (
        <p className={styles.regenerateError} role="alert">
          {regenerateError}
        </p>
      ) : null}

      {showFailedBanner ? (
        <div className={styles.failedBanner} role="alert">
          <div className={styles.failedBannerText}>
            <strong>Knowledge extraction failed.</strong>
            {knowledge.last_extraction_reason ? (
              <span>
                {" "}
                Reason: {knowledge.last_extraction_reason}
                {knowledge.last_extraction_error
                  ? ` — ${knowledge.last_extraction_error}`
                  : null}
              </span>
            ) : (
              <span> Please try regenerating.</span>
            )}
          </div>
          <button
            type="button"
            className={styles.failedBannerButton}
            onClick={handleRegenerate}
            disabled={isRegenerating}
          >
            Regenerate Knowledge
          </button>
        </div>
      ) : null}

      {ready ? (
        <div className={styles.ready}>
          <span className={styles.readyText}>
            Knowledge je hotová — všechny karty jsou schválené.
          </span>
          <Link href={projectHref} className={styles.readyLink}>
            Přejít na projekt
          </Link>
        </div>
      ) : null}

      {knowledge.scenarios.length > 0 ? (
        <section className={styles.scenarios}>
          <h3 className={styles.scenariosTitle}>Scenarios</h3>
          <p className={styles.scenariosHint}>
            Konkrétní situace, které AI používá jako inspiraci. Read-only.
          </p>
          <ul className={styles.scenarioList}>
            {knowledge.scenarios.map((scenario, index) => (
              <li
                key={`${scenario.text}-${index}`}
                className={styles.scenarioItem}
              >
                <span className={styles.scenarioText}>{scenario.text}</span>
                <span className={styles.scenarioSource}>{scenario.source}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className={styles.grid}>
        {CARDS.map((config) => {
          const card = knowledge.cards[config.key] as unknown as Record<
            string,
            unknown
          >;
          const fields: KnowledgeCardField[] = config.fields.map((field) => ({
            key: field.key,
            label: field.label,
            values: Array.isArray(card[field.key])
              ? (card[field.key] as string[])
              : [],
          }));

          return (
            <KnowledgeCard
              key={config.key}
              projectId={projectId}
              cardKey={config.key}
              title={config.title}
              status={knowledge.cards[config.key].status}
              fields={fields}
              onApproved={handleApproved}
              proofStatements={
                config.key === "proof" ? proofStatements : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
