import type { SettingsGroup as SettingsGroupModel } from "@/lib/config/settingsStatus";
import { StatusBadge } from "@/components/settings/StatusBadge/StatusBadge";
import styles from "./SettingsGroup.module.css";

interface SettingsGroupProps {
  group: SettingsGroupModel;
}

export function SettingsGroup({ group }: SettingsGroupProps) {
  return (
    <section className={styles.group}>
      <h2 className={styles.title}>{group.title}</h2>
      <ul className={styles.list}>
        {group.items.map((item) => (
          <li key={item.label} className={styles.row}>
            <span className={styles.label}>{item.label}</span>
            <StatusBadge configured={item.configured} />
          </li>
        ))}
      </ul>
    </section>
  );
}
