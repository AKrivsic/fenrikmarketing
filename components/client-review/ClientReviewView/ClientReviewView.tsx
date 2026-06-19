"use client";

import { useRef, useState, useTransition } from "react";
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
import { FenrikStudioLogo } from "@/components/brand/FenrikStudioLogo/FenrikStudioLogo";
import { SampleRequestForm } from "@/components/content-packages/SampleRequestForm/SampleRequestForm";
import { PublishPlatformOutputs } from "@/components/content-packages/PublishPlatformOutputs/PublishPlatformOutputs";
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
  "YouTube title + description",
  "Facebook post",
  "LinkedIn post",
  "X posts (when generated)",
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

export function ClientReviewView({ project, items, comments }: ClientReviewViewProps) {
  const [pending, startTransition] = useTransition();
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const orderFormRef = useRef<HTMLElement>(null);
  const commentsByItem = new Map<string, ClientProjectCommentRow[]>();
  for (const c of comments) {
    if (c.authorType === "internal") continue;
    const list = commentsByItem.get(c.clientProjectItemId) ?? [];
    list.push(c);
    commentsByItem.set(c.clientProjectItemId, list);
  }

  const paid = project.paid;

  function openOrderForm() {
    setOrderFormOpen(true);
    requestAnimationFrame(() => {
      orderFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.siteBrand}>
        <FenrikStudioLogo variant="landing" />
      </div>
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
            <p>After payment, video download will be unlocked.</p>
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

            <div className={styles.itemShowcase}>
              <div className={styles.itemMedia}>
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
              </div>

              <PublishPlatformOutputs sections={item.publishSections} />
            </div>

            {item.clientNote ? (
              <details className={styles.noteDetails}>
                <summary className={styles.noteSummary}>Note</summary>
                <p className={styles.noteBody}>{item.clientNote}</p>
              </details>
            ) : null}

            <div className={styles.downloads}>
              {paid && item.hasVideo ? (
                <a href={videoDownloadHref(project.id, item.id)} className={styles.downloadLink}>
                  Download video
                </a>
              ) : (
                <span className={styles.downloadLocked}>Download video (locked)</span>
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
          <button type="button" className={styles.primaryBtn} onClick={openOrderForm}>
            Request Full Package
          </button>
        </div>
        {orderFormOpen ? (
          <section
            ref={orderFormRef}
            className={styles.orderFormSection}
            id="order-form"
            aria-labelledby="order-form-title"
          >
            <h3 className={styles.orderFormTitle} id="order-form-title">
              Request a full package
            </h3>
            <p className={styles.orderFormLead}>
              Same form as on our homepage — tell us about your business and which
              package you want (Starter, Growth, or Monthly).
            </p>
            <SampleRequestForm
              variant="full_package"
              clientProjectId={project.id}
              clientProjectTitle={project.title}
            />
          </section>
        ) : null}
      </section>
    </div>
  );
}
