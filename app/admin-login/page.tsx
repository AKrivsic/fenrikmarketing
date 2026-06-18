import { AdminLoginForm } from "@/components/admin/AdminLoginForm/AdminLoginForm";
import { sanitizeAdminRedirectPath } from "@/lib/auth/admin-gate";
import styles from "./page.module.css";

interface AdminLoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeAdminRedirectPath(params.next);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Admin sign in</h1>
        <p className={styles.lead}>
          Internal dashboard access. Public content and client review pages do not
          require this password.
        </p>
        <AdminLoginForm nextPath={nextPath} />
      </div>
    </div>
  );
}
