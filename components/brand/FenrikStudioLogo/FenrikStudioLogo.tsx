import styles from "./FenrikStudioLogo.module.css";

export const FENRIK_LOGO_SRC = "/fenrik-logo.webp";

export type FenrikStudioLogoVariant = "nav" | "landing" | "header" | "login";

interface FenrikStudioLogoProps {
  variant?: FenrikStudioLogoVariant;
  className?: string;
}

export function FenrikStudioLogo({
  variant = "landing",
  className,
}: FenrikStudioLogoProps) {
  const variantClass =
    variant === "nav"
      ? styles.nav
      : variant === "header"
        ? styles.header
        : variant === "login"
          ? styles.login
          : styles.landing;

  return (
    <img
      src={FENRIK_LOGO_SRC}
      alt="Fenrik Studio"
      width={685}
      height={249}
      className={[styles.logo, variantClass, className].filter(Boolean).join(" ")}
      decoding="async"
    />
  );
}
