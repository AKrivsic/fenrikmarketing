"use client";

import { useTransition } from "react";
import type {
  ClientProjectCommentRow,
  ClientProjectItemRow,
  ClientProjectRow,
} from "@/lib/api/client-delivery-admin";
import {
  addItemCommentAction,
  approveProjectAction,
  requestChangesAction,
} from "@/app/client-review/[projectId]/actions";
import styles from "./ClientReviewView.module.css";

interface ClientReviewViewProps {
  project: ClientProjectRow;
  items: ClientProjectItemRow[];
  comments: ClientProjectCommentRow[];
}

export function ClientReviewView({ project, items, comments }: ClientReviewViewProps) {
  const [pending, startTransition] = useTransition();
  const commentsByItem = new Map<string, ClientProjectCommentRow[]>();
  for (const c of comments) {
    if (c.authorType === "internal") continue;
    const list = commentsByItem.get(c.clientProjectItemId) ?? [];
    list.push(c);
    commentsByItem.set(c.clientProjectItemId, list);
  }

  const paid = project.paid;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{project.title}</h1>
        <p className={styles.status}>Status: {project.status.replaceAll("_", " ")}</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryBtn}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await approveProjectAction(project.id);
              })
            }
          >
            Approve project
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await requestChangesAction(project.id);
              })
            }
          >
            Request changes
          </button>
        </div>
      </header>

      {!paid ? (
        <p className={styles.lockBanner}>Downloads unlock after payment.</p>
      ) : null}

      {items.length === 0 ? (
        <p className={styles.muted}>Content is being prepared.</p>
      ) : (
        items.map((item, index) => (
          <article key={item.id} className={styles.item}>
            <h2 className={styles.itemTitle}>Video #{index + 1}</h2>
            {item.title ? <p className={styles.itemName}>{item.title}</p> : null}

            {item.videoUrl ? (
              <video src={item.videoUrl} controls className={styles.video} preload="metadata" />
            ) : (
              <p className={styles.muted}>Video preview not available yet.</p>
            )}

            <dl className={styles.fields}>
              <div>
                <dt>TikTok Caption</dt>
                <dd>{item.tikTokCaption || "—"}</dd>
              </div>
              <div>
                <dt>Instagram Caption</dt>
                <dd>{item.instagramCaption || "—"}</dd>
              </div>
              <div>
                <dt>Facebook Post</dt>
                <dd>{item.facebookPost || "—"}</dd>
              </div>
              <div>
                <dt>LinkedIn Post</dt>
                <dd>{item.linkedinPost || "—"}</dd>
              </div>
              <div>
                <dt>Hashtags</dt>
                <dd>{item.hashtags.length ? item.hashtags.join(" ") : "—"}</dd>
              </div>
              {item.clientNote ? (
                <div>
                  <dt>Note</dt>
                  <dd>{item.clientNote}</dd>
                </div>
              ) : null}
            </dl>

            <div className={styles.downloads}>
              {paid && item.videoUrl ? (
                <a href={item.videoUrl} download className={styles.downloadLink}>
                  Download video
                </a>
              ) : (
                <span className={styles.downloadLocked}>Download video (locked)</span>
              )}
              {paid ? (
                <a
                  href={`/api/client-projects/${project.id}/export?format=txt&itemId=${item.id}&client=1`}
                  className={styles.downloadLink}
                >
                  Download captions (.txt)
                </a>
              ) : (
                <span className={styles.downloadLocked}>Download captions (locked)</span>
              )}
            </div>

            <ul className={styles.comments}>
              {(commentsByItem.get(item.id) ?? []).map((c) => (
                <li key={c.id}>
                  <span className={styles.commentAuthor}>{c.authorType}</span>: {c.comment}
                </li>
              ))}
            </ul>

            <form
              className={styles.commentForm}
              action={(fd) =>
                startTransition(async () => {
                  await addItemCommentAction(fd);
                })
              }
            >
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="itemId" value={item.id} />
              <label>
                Add comment
                <textarea name="comment" rows={2} required className={styles.textarea} />
              </label>
              <button type="submit" className={styles.secondaryBtn} disabled={pending}>
                Post comment
              </button>
            </form>
          </article>
        ))
      )}

      {paid && items.length > 0 ? (
        <p className={styles.fullExport}>
          <a href={`/api/client-projects/${project.id}/export?format=json&client=1`} className={styles.downloadLink}>
            Download full package (JSON)
          </a>
        </p>
      ) : null}
    </div>
  );
}
