"use client";

import { useTransition } from "react";
import type {
  ClientProjectCommentRow,
  ClientProjectItemClientView,
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
  items: ClientProjectItemClientView[];
  comments: ClientProjectCommentRow[];
}

const PACKAGE_INCLUDES = [
  "1 short-form video",
  "TikTok caption",
  "Instagram caption",
  "Facebook post",
  "LinkedIn post",
  "hashtags",
];

const PRICING = [
  {
    name: "Starter",
    price: "$199",
    detail: "5 content packages — about 1 week of weekday content",
  },
  {
    name: "Growth",
    price: "$349",
    detail: "10 content packages — about 2 weeks of weekday content",
  },
  {
    name: "Monthly",
    price: "$599",
    detail: "20 content packages — about 1 month of weekday content",
  },
] as const;

function videoPreviewSrc(projectId: string, itemId: string): string {
  return `/api/client-projects/${projectId}/video?itemId=${encodeURIComponent(itemId)}`;
}

function videoDownloadHref(projectId: string, itemId: string): string {
  return `/api/client-projects/${projectId}/video?itemId=${encodeURIComponent(itemId)}&download=1`;
}

function requestPackageMailto(projectTitle: string, projectId: string): string {
  const subject = encodeURIComponent(`Full content package — ${projectTitle}`);
  const body = encodeURIComponent(
    `Hi,\n\nI reviewed my sample and would like to order a full content package.\n\nProject: ${projectTitle}\nReview link path: /client-review/${projectId}\n\nThanks!`,
  );
  return `mailto:hello@fenrikmarketing.com?subject=${subject}&body=${body}`;
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
  const mailtoHref = requestPackageMailto(project.title, project.id);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Content package preview</p>
        <h1 className={styles.title}>{project.title}</h1>
        <p className={styles.status}>Status: {project.status.replaceAll("_", " ")}</p>
        {paid ? (
          <p className={styles.paidBanner}>Paid — downloads unlocked</p>
        ) : (
          <p className={styles.lockBanner}>
            Preview only. Downloads unlock after payment.
          </p>
        )}
        <div className={styles.intro}>
          <p>
            This is a <strong>free sample</strong> content package — one video and
            platform-ready text you can review here.
          </p>
          <p>You can review the video and text here. Use comments if you want changes.</p>
          {!paid ? (
            <p>After payment, downloads for video and captions will be unlocked.</p>
          ) : null}
        </div>
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

      {items.length === 0 ? (
        <p className={styles.muted}>Content is being prepared.</p>
      ) : (
        items.map((item, index) => (
          <article key={item.id} className={styles.item}>
            <h2 className={styles.itemTitle}>Video #{index + 1}</h2>
            {item.title ? <p className={styles.itemName}>{item.title}</p> : null}

            {item.hasVideo ? (
              <video
                src={videoPreviewSrc(project.id, item.id)}
                controls
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
                playsInline
                className={styles.video}
                preload="metadata"
              />
            ) : (
              <p className={styles.muted}>Video preview not available yet.</p>
            )}

            <div className={styles.platformBlocks}>
              <details className={styles.platformDetails} open>
                <summary className={styles.platformSummary}>TikTok caption</summary>
                <p className={styles.platformBody}>{item.tikTokCaption || "—"}</p>
              </details>
              <details className={styles.platformDetails}>
                <summary className={styles.platformSummary}>Instagram caption</summary>
                <p className={styles.platformBody}>{item.instagramCaption || "—"}</p>
              </details>
              <details className={styles.platformDetails}>
                <summary className={styles.platformSummary}>Facebook post</summary>
                <p className={styles.platformBody}>{item.facebookPost || "—"}</p>
              </details>
              <details className={styles.platformDetails}>
                <summary className={styles.platformSummary}>LinkedIn post</summary>
                <p className={styles.platformBody}>{item.linkedinPost || "—"}</p>
              </details>
              <details className={styles.platformDetails}>
                <summary className={styles.platformSummary}>Hashtags</summary>
                <p className={styles.platformBody}>
                  {item.hashtags.length ? item.hashtags.join(" ") : "—"}
                </p>
              </details>
              {item.clientNote ? (
                <details className={styles.platformDetails} open>
                  <summary className={styles.platformSummary}>Note</summary>
                  <p className={styles.platformBody}>{item.clientNote}</p>
                </details>
              ) : null}
            </div>

            <div className={styles.downloads}>
              {paid && item.hasVideo ? (
                <a href={videoDownloadHref(project.id, item.id)} className={styles.downloadLink}>
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
          <a
            href={`/api/client-projects/${project.id}/export?format=json&client=1`}
            className={styles.downloadLink}
          >
            Download full package (JSON)
          </a>
        </p>
      ) : null}

      <section className={styles.conversion} id="order">
        <h2 className={styles.conversionTitle}>Want more content like this?</h2>
        <p className={styles.conversionLead}>
          This is one sample content package. We can create a full batch for your business.
        </p>
        <div className={styles.pricingGrid}>
          {PRICING.map((tier) => (
            <article key={tier.name} className={styles.pricingCard}>
              <p className={styles.pricingName}>{tier.name}</p>
              <p className={styles.pricingPrice}>{tier.price}</p>
              <p className={styles.pricingDetail}>{tier.detail}</p>
              <p className={styles.pricingIncludesLabel}>Each package includes:</p>
              <ul className={styles.pricingIncludes}>
                {PACKAGE_INCLUDES.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <div className={styles.conversionActions}>
          <a href={mailtoHref} className={styles.primaryBtnLink}>
            Request Full Package
          </a>
          <a href="/content-packages" className={styles.secondaryBtnLink}>
            View packages
          </a>
        </div>
      </section>
    </div>
  );
}
