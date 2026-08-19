import { PageHeader } from "@/components/PageHeader/PageHeader";
import { SettingsGroup } from "@/components/settings/SettingsGroup/SettingsGroup";
import { EditorLanguageSettings } from "@/components/settings/EditorLanguageSettings/EditorLanguageSettings";
import { getAdminPreferences } from "@/lib/admin/adminPreferences";
import { getSettingsStatus } from "@/lib/config/settingsStatus";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const groups = getSettingsStatus();
  const preferences = await getAdminPreferences();

  return (
    <div className={styles.page}>
      <PageHeader
        title="Settings"
        description="Configuration status (read-only values) and admin preferences."
      />
      <p className={styles.back}>
        <a href="/settings/ai-media-benchmark">AI Media Benchmark Lab →</a>
      </p>
      <div className={styles.groups}>
        <EditorLanguageSettings initialLanguage={preferences.editorLanguage} />
        {groups.map((group) => (
          <SettingsGroup key={group.title} group={group} />
        ))}
      </div>
    </div>
  );
}
