"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProjectAssetFields } from "@/app/projects/[id]/assets/actions";
import type { AssetView } from "@/lib/api/assets-admin";
import {
  PRODUCT_ROLE_LABELS,
  PRODUCT_ROLES,
} from "@/lib/assets/productRole";
import styles from "./AssetEditForm.module.css";

const ASSET_CLASS_OPTIONS = [
  { value: "static", label: "Static" },
  { value: "editable", label: "Editable" },
  { value: "reference", label: "Reference" },
];

interface AssetEditFormProps {
  projectId: string;
  asset: AssetView;
  onDone: () => void;
}

export function AssetEditForm({ projectId, asset, onDone }: AssetEditFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(asset.title);
  const [assetClass, setAssetClass] = useState<string>(asset.assetClass);
  const [productRole, setProductRole] = useState(asset.productRole ?? "");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = new FormData();
    formData.set("title", title);
    formData.set("assetClass", assetClass);
    formData.set("productRole", productRole);

    startTransition(async () => {
      const result = await updateProjectAssetFields(projectId, asset.id, formData);
      if (result.ok) {
        router.refresh();
        onDone();
      } else {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
      }
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <span className={styles.label}>Název</span>
        <input
          className={styles.input}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isPending}
        />
        {fieldErrors.title ? (
          <span className={styles.fieldError}>{fieldErrors.title}</span>
        ) : null}
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Mode</span>
        <select
          className={styles.input}
          value={assetClass}
          onChange={(e) => setAssetClass(e.target.value)}
          disabled={isPending}
        >
          {ASSET_CLASS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Product role</span>
        <select
          className={styles.input}
          value={productRole}
          onChange={(e) => setProductRole(e.target.value)}
          disabled={isPending}
        >
          <option value="">—</option>
          {PRODUCT_ROLES.map((role) => (
            <option key={role} value={role}>
              {PRODUCT_ROLE_LABELS[role]}
            </option>
          ))}
        </select>
        {fieldErrors.productRole ? (
          <span className={styles.fieldError}>{fieldErrors.productRole}</span>
        ) : null}
      </label>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.buttons}>
        <button type="button" className={styles.cancel} onClick={onDone} disabled={isPending}>
          Zrušit
        </button>
        <button type="submit" className={styles.submit} disabled={isPending}>
          {isPending ? "Ukládám…" : "Uložit"}
        </button>
      </div>
    </form>
  );
}
