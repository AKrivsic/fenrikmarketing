"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./CopyButton.module.css";

interface CopyButtonProps {
  // The exact text written to the clipboard.
  text: string;
  // Idle label, e.g. "Copy", "Copy title", "Copy description".
  label?: string;
  // Label shown briefly after a successful copy.
  copiedLabel?: string;
}

const COPIED_RESET_MS = 1500;

export function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch {
      // Clipboard can be unavailable (insecure context / denied permission).
      // Fail silently — the text stays visible for manual selection.
    }
  }, [text]);

  return (
    <button
      type="button"
      className={styles.button}
      onClick={handleCopy}
      data-copied={copied ? "true" : undefined}
      disabled={text.length === 0}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
