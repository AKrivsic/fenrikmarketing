"use client";

import { useState, useTransition } from "react";
import { adminLoginAction } from "@/app/admin-login/actions";
import styles from "./AdminLoginForm.module.css";

interface AdminLoginFormProps {
  nextPath: string;
}

export function AdminLoginForm({ nextPath }: AdminLoginFormProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className={styles.form}
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await adminLoginAction(formData);
          if (!result.ok) setError(result.error);
        });
      }}
    >
      <input type="hidden" name="next" value={nextPath} />
      {error ? <p className={styles.error}>{error}</p> : null}
      <label className={styles.label}>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={styles.input}
        />
      </label>
      <button type="submit" className={styles.button} disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
