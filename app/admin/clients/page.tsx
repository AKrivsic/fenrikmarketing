import Link from "next/link";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import {
  listClients,
  listSampleRequests,
} from "@/lib/api/client-delivery-admin";
import { convertSampleToClient, createClientAction } from "./actions";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
  const [clients, sampleRequests] = await Promise.all([
    listClients(),
    listSampleRequests(),
  ]);

  const openSamples = sampleRequests.filter((r) => r.status === "new");

  return (
    <div className={styles.page}>
      <PageHeader
        title="Content clients"
        description="Sample requests and client delivery projects."
      />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Sample requests</h2>
        {openSamples.length === 0 ? (
          <p className={styles.muted}>No new sample requests.</p>
        ) : (
          <ul className={styles.list}>
            {openSamples.map((req) => (
              <li key={req.id} className={styles.card}>
                <div className={styles.cardMain}>
                  <p className={styles.cardTitle}>{req.name}</p>
                  <p className={styles.muted}>
                    {req.email}
                    {req.company ? ` · ${req.company}` : ""}
                  </p>
                  {req.websiteUrl ? (
                    <p className={styles.muted}>{req.websiteUrl}</p>
                  ) : null}
                  {req.notes ? <p className={styles.notes}>{req.notes}</p> : null}
                </div>
                <form action={convertSampleToClient}>
                  <input type="hidden" name="sampleRequestId" value={req.id} />
                  <button type="submit" className={styles.primaryBtn}>
                    Create client
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Clients</h2>
          <details className={styles.details}>
            <summary className={styles.summary}>New client</summary>
            <form action={createClientAction} className={styles.inlineForm}>
              <input name="name" placeholder="Name" required className={styles.input} />
              <input name="email" type="email" placeholder="Email" required className={styles.input} />
              <input name="company" placeholder="Company" className={styles.input} />
              <input name="websiteUrl" placeholder="Website URL" className={styles.input} />
              <button type="submit" className={styles.primaryBtn}>
                Create
              </button>
            </form>
          </details>
        </div>
        {clients.length === 0 ? (
          <p className={styles.muted}>No clients yet.</p>
        ) : (
          <ul className={styles.list}>
            {clients.map((client) => (
              <li key={client.id}>
                <Link href={`/admin/clients/${client.id}`} className={styles.clientLink}>
                  <span className={styles.cardTitle}>{client.name}</span>
                  <span className={styles.muted}>{client.email}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
