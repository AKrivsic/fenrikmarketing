"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateProjectPresentationVoice } from "@/app/projects/[id]/knowledge/actions";
import type { Json } from "@/lib/supabase/types";
import {
  SUPPORTED_VOICE_OPTIONS,
  ttsInstructionsFromKnowledge,
  voiceUiSelectionFromKnowledge,
  type VoiceUiSelection,
} from "@/lib/voice/presentationSettings";
import {
  VISUAL_PROFILE_UI_OPTIONS,
  visualProfileUiFromKnowledge,
  type VisualProfileUiChoice,
} from "@/lib/visual-profile/presentationVisualProfile";
import {
  VISUAL_MEDIUM_UI_OPTIONS,
  visualMediumUiFromKnowledge,
  type VisualMediumUiChoice,
} from "@/lib/visual-medium/presentationVisualMedium";
import styles from "./PresentationVoiceSettings.module.css";

interface PresentationVoiceSettingsProps {
  projectId: string;
  knowledgeJson: Json;
}

export function PresentationVoiceSettings({
  projectId,
  knowledgeJson,
}: PresentationVoiceSettingsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [voiceSelection, setVoiceSelection] = useState<VoiceUiSelection>(
    () => voiceUiSelectionFromKnowledge(knowledgeJson),
  );
  const [ttsInstructions, setTtsInstructions] = useState(() =>
    ttsInstructionsFromKnowledge(knowledgeJson),
  );
  const [visualProfileSelection, setVisualProfileSelection] =
    useState<VisualProfileUiChoice>(() =>
      visualProfileUiFromKnowledge(knowledgeJson),
    );
  const [visualMediumSelection, setVisualMediumSelection] =
    useState<VisualMediumUiChoice>(() =>
      visualMediumUiFromKnowledge(knowledgeJson),
    );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateProjectPresentationVoice(projectId, {
        voiceSelection,
        ttsInstructions,
        visualProfileSelection,
        visualMediumSelection,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <section className={styles.section} aria-labelledby="presentation-voice-heading">
      <h3 id="presentation-voice-heading" className={styles.title}>
        Presentation
      </h3>
      <p className={styles.hint}>
        Voice controls OpenAI delivery for video voiceovers. Visual profile and
        visual medium guide automated image styling across generated content.
      </p>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.label}>
          Voice
          <select
            className={styles.select}
            value={voiceSelection}
            onChange={(e) =>
              setVoiceSelection(e.target.value as VoiceUiSelection)
            }
            disabled={isPending}
          >
            {SUPPORTED_VOICE_OPTIONS.map((option) => (
              <option key={option.value || "default"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.label}>
          Visual profile
          <select
            className={styles.select}
            value={visualProfileSelection}
            onChange={(e) =>
              setVisualProfileSelection(e.target.value as VisualProfileUiChoice)
            }
            disabled={isPending}
          >
            {VISUAL_PROFILE_UI_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.label}>
          Visual medium
          <select
            className={styles.select}
            value={visualMediumSelection}
            onChange={(e) =>
              setVisualMediumSelection(e.target.value as VisualMediumUiChoice)
            }
            disabled={isPending}
          >
            {VISUAL_MEDIUM_UI_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.label}>
          TTS instructions (optional)
          <textarea
            className={styles.textarea}
            rows={3}
            value={ttsInstructions}
            onChange={(e) => setTtsInstructions(e.target.value)}
            disabled={isPending}
            placeholder="e.g. Calm, clear, conversational."
          />
        </label>

        <div className={styles.actions}>
          <button type="submit" className={styles.saveButton} disabled={isPending}>
            {isPending ? "Saving…" : "Save presentation settings"}
          </button>
          {saved ? (
            <span className={styles.savedHint} role="status">
              Saved.
            </span>
          ) : null}
        </div>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </section>
  );
}
