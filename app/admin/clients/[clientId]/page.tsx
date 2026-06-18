import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { getClient, listClientProjects } from "@/lib/api/client-delivery-admin";
import { createProjectAction } from "../actions";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface ClientDetailPageProps {
  params: Promise<{ clientId: string }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { clientId } = await params;
  const client = await getClient(clientId);
  if (!client) notFound();

  const projects = await listClientProjects(clientId);

  return (
    <div className={styles.page}>
      <p className={styles.back}>
        <Link href="/admin/clients">← Content clients</Link>
      </p>
      <PageHeader title={client.name} description={client.email} />
      <dl className={styles.meta}>
        {client.company ? (
          <>
            <dt>Company</dt>
            <dd>{client.company}</dd>
          </>
        ) : null}
        {client.websiteUrl ? (
          <>
            <dt>Website</dt>
            <dd>{client.websiteUrl}</dd>
          </>
        ) : null}
        {client.notes ? (
          <>
            <dt>Notes</dt>
            <dd>{client.notes}</dd>
          </>
        ) : null}
      </dl>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Projects</h2>
        <form action={createProjectAction} className={styles.inlineForm}>
          <input type="hidden" name="clientId" value={clientId} />
          <input
            name="title"
            placeholder="Project title"
            required
            className={styles.input}
          />
          <button type="submit" className={styles.primaryBtn}>
            Create project
          </button>
        </form>
        {projects.length === 0 ? (
          <p className={styles.muted}>No delivery projects yet.</p>
        ) : (
          <ul className={styles.list}>
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/admin/client-projects/${project.id}`}
                  className={styles.projectLink}
                >
                  <span>{project.title}</span>
                  <span className={styles.muted}>
                    {project.status}
                    {project.paid ? " · paid" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
