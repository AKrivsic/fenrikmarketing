"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./PackageIdCopy.module.css";

interface PackageIdCopyProps {
  packageId: string;
}

const TOAST_MS = 2000;

export function PackageIdCopy({ packageId }: PackageIdCopyProps) {
  const [toastVisible, setToastVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(packageId);
      setToastVisible(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setToastVisible(false), TOAST_MS);
    } catch {
      // Clipboard unavailable — ID remains visible for manual copy.
    }
  }, [packageId]);

  return (
    <>
      <div className={styles.row}>
        <span className={styles.label}>Package ID</span>
        <code className={styles.id}>{packageId}</code>
        <button type="button" className={styles.button} onClick={handleCopy}>
          Copy ID
        </button>
      </div>
      {toastVisible ? (
        <div className={styles.toast} role="status" aria-live="polite">
          Package ID copied
        </div>
      ) : null}
    </>
  );
}
