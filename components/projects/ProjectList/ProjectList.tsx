import Link from "next/link";
import type { ProjectListItem } from "@/lib/api/projects-admin";
import { DeleteProjectButton } from "./DeleteProjectButton";
import styles from "./ProjectList.module.css";

interface ProjectListProps {
  projects: ProjectListItem[];
}

export function ProjectList({ projects }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>Zatím žádné projekty.</p>
      </div>
    );
  }

  return (
    <ul className={styles.list}>
      {projects.map((project) => (
        <li key={project.id} className={styles.item}>
          <Link href={`/projects/${project.id}`} className={styles.link}>
            <span className={styles.name}>{project.name}</span>
            <span className={styles.meta}>
              <span className={styles.metaItem}>{project.type}</span>
              <span className={styles.metaItem}>{project.language}</span>
              <span className={styles.metaItem}>{project.marketScope}</span>
              <span className={styles.metaItem}>{project.goalType}</span>
            </span>
          </Link>
          <DeleteProjectButton
            projectId={project.id}
            projectName={project.name}
          />
        </li>
      ))}
    </ul>
  );
}
