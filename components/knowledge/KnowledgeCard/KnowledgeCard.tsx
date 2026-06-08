"use client";

import { useState, useTransition } from "react";
import {
  approveKnowledgeCard,
  updateKnowledgeCard,
} from "@/app/projects/[id]/knowledge/actions";
import type {
  KnowledgeCardKey,
  KnowledgeCardStatus,
} from "@/lib/knowledge/types";
import styles from "./KnowledgeCard.module.css";

export interface KnowledgeCardField {
  key: string;
  label: string;
  values: string[];
}

// Phase 2C — read-only, asset-derived proof statements rendered on the Proof
// card. There is no editor and no manual add for these; they are produced by the
// proof extraction workflow.
export interface ProofStatementView {
  text: string;
  confidence: number;
  sourceLabel: string | null;
}

interface KnowledgeCardProps {
  projectId: string;
  cardKey: KnowledgeCardKey;
  title: string;
  status: KnowledgeCardStatus;
  fields: KnowledgeCardField[];
  onApproved: (ready: boolean) => void;
  // Only populated for the Proof card. Read-only.
  proofStatements?: ProofStatementView[];
}

const EMPTY = "—";

export function KnowledgeCard({
  projectId,
  cardKey,
  title,
  status,
  fields,
  onApproved,
  proofStatements,
}: KnowledgeCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.values.join("\n")])),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEdit() {
    setError(null);
    setDrafts(Object.fromEntries(fields.map((f) => [f.key, f.values.join("\n")])));
    setIsEditing(true);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateKnowledgeCard(projectId, cardKey, drafts);
      if (result.ok) {
        setIsEditing(false);
      } else {
        setError(result.error);
      }
    });
  }

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approveKnowledgeCard(projectId, cardKey);
      if (result.ok) {
        onApproved(result.ready);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <span
          className={
            status === "approved"
              ? `${styles.status} ${styles.approved}`
              : styles.status
          }
        >
          {status}
        </span>
      </header>

      {isEditing ? (
        <div className={styles.fields}>
          {fields.map((field) => (
            <label key={field.key} className={styles.field}>
              <span className={styles.label}>{field.label}</span>
              <textarea
                className={styles.textarea}
                rows={4}
                value={drafts[field.key] ?? ""}
                placeholder="jedna položka na řádek"
                disabled={isPending}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
              />
            </label>
          ))}
        </div>
      ) : (
        <div className={styles.fields}>
          {fields.map((field) => (
            <div key={field.key} className={styles.field}>
              <span className={styles.label}>{field.label}</span>
              {field.values.length > 0 ? (
                <ul className={styles.list}>
                  {field.values.map((value, index) => (
                    <li key={`${value}-${index}`} className={styles.listItem}>
                      {value}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.value}>{EMPTY}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {proofStatements && proofStatements.length > 0 ? (
        <div className={styles.proof}>
          <span className={styles.label}>From assets</span>
          <ul className={styles.proofList}>
            {proofStatements.map((statement, index) => (
              <li
                key={`${statement.text}-${index}`}
                className={styles.proofItem}
              >
                <span className={styles.proofText}>{statement.text}</span>
                <span className={styles.proofMeta}>
                  {statement.sourceLabel ? `${statement.sourceLabel} · ` : ""}
                  {Math.round(statement.confidence * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.buttons}>
        {isEditing ? (
          <>
            <button
              type="button"
              className={styles.save}
              disabled={isPending}
              onClick={handleSave}
            >
              {isPending ? "Ukládám…" : "Uložit"}
            </button>
            <button
              type="button"
              className={styles.cancel}
              disabled={isPending}
              onClick={() => setIsEditing(false)}
            >
              Zrušit
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={styles.approve}
              disabled={isPending}
              onClick={handleApprove}
            >
              Approve
            </button>
            <button
              type="button"
              className={styles.edit}
              disabled={isPending}
              onClick={startEdit}
            >
              Edit
            </button>
          </>
        )}
      </div>
    </article>
  );
}
