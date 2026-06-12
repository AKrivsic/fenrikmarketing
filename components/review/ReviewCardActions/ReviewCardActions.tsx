"use client";

import { useState } from "react";
import { ReviewActions } from "@/components/review/ReviewActions/ReviewActions";
import { EditItemForm } from "@/components/review/EditItemForm/EditItemForm";
import type { ApprovalStatus, LanguageCode } from "@/lib/supabase/types";
import styles from "./ReviewCardActions.module.css";

interface ReviewCardActionsProps {
  itemId: string;
  projectId: string;
  packageId: string | null;
  status: ApprovalStatus;
  caption: string | null;
  hashtags: string[];
  cta: string | null;
  isLanguageVariant: boolean;
  canGenerateVariants: boolean;
  variantLanguage: LanguageCode | null;
  // Forwarded to ReviewActions: when true the package-level Regenerate +
  // Generate language variants buttons are omitted (they live in the package
  // header). Approve / Reject / Edit and per-variant Regenerate stay.
  packageActionsInHeader?: boolean;
}

export function ReviewCardActions({
  itemId,
  projectId,
  packageId,
  status,
  caption,
  hashtags,
  cta,
  isLanguageVariant,
  canGenerateVariants,
  variantLanguage,
  packageActionsInHeader = false,
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
          status={status}
          isLanguageVariant={isLanguageVariant}
          canGenerateVariants={canGenerateVariants}
          variantLanguage={variantLanguage}
          packageActionsInHeader={packageActionsInHeader}
          onEdit={() => setIsEditing(true)}
        />
      )}
    </div>
  );
}
