import type { Json, Project } from "@/lib/supabase/types";
import {
  canonicalWebsiteUrl,
  websiteUrlStatus,
} from "@/lib/knowledge/websiteUrl";
import { projectServiceMix } from "@/lib/projects/serviceMix";
import styles from "./ProjectBrain.module.css";

interface ProjectBrainProps {
  project: Project;
}

const EMPTY = "—";

function TextField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <p className={styles.value}>{value && value.length > 0 ? value : EMPTY}</p>
    </div>
  );
}

function ListField({ label, values }: { label: string; values: string[] }) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      {values.length > 0 ? (
        <ul className={styles.list}>
          {values.map((value, index) => (
            <li key={`${value}-${index}`} className={styles.listItem}>
              {value}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.value}>{EMPTY}</p>
      )}
    </div>
  );
}

function JsonField({ label, value }: { label: string; value: Json }) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <pre className={styles.json}>{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}

// Website URL field with a configured/missing status badge (Part 1 + Part 4).
function WebsiteUrlField({ project }: { project: Project }) {
  const url = canonicalWebsiteUrl(project);
  const status = websiteUrlStatus(project);
  return (
    <div className={styles.field}>
      <span className={styles.label}>Website URL</span>
      <p className={`${styles.value} ${styles.urlValue}`}>
        {url ?? EMPTY}{" "}
        <span
          className={
            status === "configured" ? styles.statusOk : styles.statusMissing
          }
        >
          {status === "configured" ? "configured" : "missing"}
        </span>
      </p>
    </div>
  );
}

export function ProjectBrain({ project }: ProjectBrainProps) {
  const serviceMix = projectServiceMix(project);
  return (
    <div className={styles.brain}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Základní</h2>
        <div className={styles.grid}>
          <TextField label="Typ" value={project.type} />
          <TextField label="Primary language" value={project.language} />
          <ListField
            label="Language variants"
            values={project.enabled_languages}
          />
          <TextField label="Market scope" value={project.market_scope} />
          <TextField label="Goal" value={project.goal_type} />
          <TextField label="Default CTA" value={project.default_cta} />
          <WebsiteUrlField project={project} />
          <ListField
            label="Service mix"
            values={serviceMix.map((entry) => `${entry.service} = ${entry.weight}`)}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Produkt</h2>
        <ListField label="Product is" values={project.product_is} />
        <ListField label="Product is not" values={project.product_is_not} />
        <ListField label="Strengths" values={project.product_strengths} />
        <ListField label="Pain points" values={project.pain_points} />
        <ListField label="Forbidden claims" values={project.forbidden_claims} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Distribuce</h2>
        <ListField label="Platforms" values={project.platforms} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Strukturovaná data</h2>
        <JsonField label="Target audience" value={project.target_audience} />
        <JsonField label="Tone of voice" value={project.tone_of_voice} />
        <JsonField label="Publishing rules" value={project.publishing_rules} />
      </section>
    </div>
  );
}
