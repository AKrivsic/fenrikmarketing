"use client";

import { useState, type ReactNode } from "react";
import { ProjectBrainForm } from "@/components/projects/ProjectBrainForm/ProjectBrainForm";
import type { Project } from "@/lib/supabase/types";
import styles from "./ProjectBrainPanel.module.css";

interface ProjectBrainPanelProps {
  project: Project;
  readView: ReactNode;
}

export function ProjectBrainPanel({
  project,
  readView,
}: ProjectBrainPanelProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <ProjectBrainForm project={project} onDone={() => setIsEditing(false)} />
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.editButton}
          onClick={() => setIsEditing(true)}
        >
          Edit
        </button>
      </div>
      {readView}
    </div>
  );
}
