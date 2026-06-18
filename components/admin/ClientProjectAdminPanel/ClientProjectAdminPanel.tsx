"use client";

import Link from "next/link";
import { useTransition } from "react";
import type {
  ClientProjectCommentRow,
  ClientProjectItemRow,
  ClientProjectPackageRow,
  ClientProjectRow,
  ClientRow,
} from "@/lib/api/client-delivery-admin";
import {
  importPackageAction,
  markProjectPaidAction,
  saveItemAction,
  updateProjectStatusAction,
} from "@/app/admin/clients/actions";
import styles from "./ClientProjectAdminPanel.module.css";

const STATUSES = [
  "draft",
  "preview_sent",
  "revision_requested",
  "approved",
  "paid",
  "delivered",
] as const;

interface ClientProjectAdminPanelProps {
  project: ClientProjectRow;
  client: ClientRow;
  packages: ClientProjectPackageRow[];
  items: ClientProjectItemRow[];
  comments: ClientProjectCommentRow[];
}

export function ClientProjectAdminPanel({
  project,
  client,
  packages,
  items,
  comments,
}: ClientProjectAdminPanelProps) {
  const [pending, startTransition] = useTransition();
  const commentsByItem = new Map<string, ClientProjectCommentRow[]>();
  for (const c of comments) {
    const list = commentsByItem.get(c.clientProjectItemId) ?? [];
    list.push(c);
    commentsByItem.set(c.clientProjectItemId, list);
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.back}>
        <Link href={`/admin/clients/${client.id}`}>← {client.name}</Link>
      </p>

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{project.title}</h1>
          <p className={styles.meta}>
            Status: <strong>{project.status}</strong>
            {project.paid ? " · Paid" : " · Unpaid"}
          </p>
          <p className={styles.meta}>
            Client review:{" "}
            <a href={`/client-review/${project.id}`} className={styles.reviewLink}>
              /client-review/{project.id}
            </a>
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            disabled={pending || project.paid}
            onClick={() =>
              startTransition(async () => {
                await markProjectPaidAction(project.id);
              })
            }
          >
            Mark as paid
          </button>
          <button type="button" className={styles.secondaryBtn} disabled title="Placeholder">
            Send email
          </button>
          <a
            href={`/api/client-projects/${project.id}/export?format=txt`}
            className={styles.secondaryBtn}
          >
            Download package
          </a>
        </div>
      </header>

      <form
        className={styles.statusForm}
        action={(fd) =>
          startTransition(async () => {
            await updateProjectStatusAction(fd);
          })
        }
      >
        <input type="hidden" name="projectId" value={project.id} />
        <label>
          Update status
          <select name="status" defaultValue={project.status} className={styles.select}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={styles.primaryBtn} disabled={pending}>
          Save status
        </button>
      </form>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Import internal package</h2>
        <form
          className={styles.importForm}
          action={(fd) =>
            startTransition(async () => {
              await importPackageAction(fd);
            })
          }
        >
          <input type="hidden" name="projectId" value={project.id} />
          <input
            name="internalPackageId"
            placeholder="content_packages UUID"
            className={styles.input}
            required
          />
          <button type="submit" className={styles.primaryBtn} disabled={pending}>
            Import
          </button>
        </form>
        {packages.length > 0 ? (
          <ul className={styles.pkgList}>
            {packages.map((pkg) => (
              <li key={pkg.id}>
                {pkg.title}
                {pkg.internalPackageId ? (
                  <span className={styles.muted}> · {pkg.internalPackageId}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Content items</h2>
        {items.length === 0 ? (
          <p className={styles.muted}>No items yet. Import an internal package.</p>
        ) : (
          items.map((item, index) => (
            <article key={item.id} className={styles.itemCard}>
              <h3 className={styles.itemTitle}>Video #{index + 1}</h3>
              {item.videoUrl ? (
                <video
                  src={item.videoUrl}
                  controls
                  className={styles.video}
                  preload="metadata"
                />
              ) : (
                <p className={styles.muted}>No video URL</p>
              )}

              <form
                className={styles.itemForm}
                action={(fd) =>
                  startTransition(async () => {
                    await saveItemAction(fd);
                  })
                }
              >
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="projectId" value={project.id} />
                <label>
                  Title
                  <input name="title" defaultValue={item.title} className={styles.input} />
                </label>
                <label>
                  Video URL
                  <input name="videoUrl" defaultValue={item.videoUrl ?? ""} className={styles.input} />
                </label>
                <label>
                  TikTok caption
                  <textarea name="tikTokCaption" rows={3} defaultValue={item.tikTokCaption} className={styles.textarea} />
                </label>
                <label>
                  Instagram caption
                  <textarea name="instagramCaption" rows={3} defaultValue={item.instagramCaption} className={styles.textarea} />
                </label>
                <label>
                  Facebook post
                  <textarea name="facebookPost" rows={3} defaultValue={item.facebookPost} className={styles.textarea} />
                </label>
                <label>
                  LinkedIn post
                  <textarea name="linkedinPost" rows={3} defaultValue={item.linkedinPost} className={styles.textarea} />
                </label>
                <label>
                  Hashtags (space or comma separated)
                  <input name="hashtags" defaultValue={item.hashtags.join(" ")} className={styles.input} />
                </label>
                <label>
                  Client-visible note
                  <textarea name="clientNote" rows={2} defaultValue={item.clientNote ?? ""} className={styles.textarea} />
                </label>
                <label>
                  Internal note
                  <textarea name="internalNote" rows={2} defaultValue={item.internalNote ?? ""} className={styles.textarea} />
                </label>
                <button type="submit" className={styles.primaryBtn} disabled={pending}>
                  Save item
                </button>
              </form>

              {(commentsByItem.get(item.id) ?? []).length > 0 ? (
                <ul className={styles.commentList}>
                  {(commentsByItem.get(item.id) ?? []).map((c) => (
                    <li key={c.id}>
                      <span className={styles.commentMeta}>{c.authorType}</span> {c.comment}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
