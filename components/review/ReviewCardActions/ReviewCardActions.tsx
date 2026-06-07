"use client";

import { useState } from "react";
import { ReviewActions } from "@/components/review/ReviewActions/ReviewActions";
import { EditItemForm } from "@/components/review/EditItemForm/EditItemForm";
import styles from "./ReviewCardActions.module.css";

interface ReviewCardActionsProps {
  itemId: string;
  projectId: string;
  packageId: string | null;
  caption: string | null;
  hashtags: string[];
  cta: string | null;
}

export function ReviewCardActions({
  itemId,
  projectId,
  packageId,
  caption,
  hashtags,
  cta,
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
          onEdit={() => setIsEditing(true)}
        />
      )}
    </div>
  );
}
