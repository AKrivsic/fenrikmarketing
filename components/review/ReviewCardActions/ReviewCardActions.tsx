"use client";

import { useState } from "react";
import { ReviewActions } from "@/components/review/ReviewActions/ReviewActions";
import { EditItemForm } from "@/components/review/EditItemForm/EditItemForm";
import type { LanguageCode } from "@/lib/supabase/types";
import styles from "./ReviewCardActions.module.css";

interface ReviewCardActionsProps {
  itemId: string;
  projectId: string;
  packageId: string | null;
  caption: string | null;
  hashtags: string[];
  cta: string | null;
  isLanguageVariant: boolean;
  canGenerateVariants: boolean;
  variantLanguage: LanguageCode | null;
}

export function ReviewCardActions({
  itemId,
  projectId,
  packageId,
  caption,
  hashtags,
  cta,
  isLanguageVariant,
  canGenerateVariants,
  variantLanguage,
}: ReviewCardActionsProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className={styles.container}>
      {isEditing ? (
        <EditItemForm
          itemId={itemId}
          projectId={projectId}
          caption={caption}
          hashtags={hashtags}
          cta={cta}
          onDone={() => setIsEditing(false)}
        />
      ) : (
        <ReviewActions
          itemId={itemId}
          projectId={projectId}
          packageId={packageId}
          isLanguageVariant={isLanguageVariant}
          canGenerateVariants={canGenerateVariants}
          variantLanguage={variantLanguage}
          onEdit={() => setIsEditing(true)}
        />
      )}
    </div>
  );
}
