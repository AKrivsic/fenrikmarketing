import { PageHeader } from "@/components/PageHeader/PageHeader";
import { SettingsGroup } from "@/components/settings/SettingsGroup/SettingsGroup";
import { getSettingsStatus } from "@/lib/config/settingsStatus";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const groups = getSettingsStatus();

  return (
    <div className={styles.page}>
      <PageHeader
        title="Settings"
        description="Stav konfigurace (read-only). Zobrazují se pouze stavy, nikdy hodnoty."
      />
      <div className={styles.groups}>
        {groups.map((group) => (
          <SettingsGroup key={group.title} group={group} />
        ))}
      </div>
    </div>
  );
}
