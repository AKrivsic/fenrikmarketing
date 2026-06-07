// Server-only, read-only config status for the internal admin Settings page.
// Reports ONLY presence (configured/missing) of known env vars. It NEVER returns,
// logs, or exposes any env value or secret — every item is reduced to a boolean
// via isConfigured() before leaving this module. No DB, no mutations.

export interface SettingStatus {
  label: string;
  configured: boolean;
}

export interface SettingsGroup {
  title: string;
  items: SettingStatus[];
}

// Coerces an env var to a boolean "is set" flag. The value itself is discarded
// here and never propagated, so no secret can leak through the read model.
function isConfigured(name: string): boolean {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0;
}

export function getSettingsStatus(): SettingsGroup[] {
  return [
    {
      title: "Supabase",
      items: [
        { label: "Supabase URL", configured: isConfigured("NEXT_PUBLIC_SUPABASE_URL") },
        { label: "Anon key", configured: isConfigured("NEXT_PUBLIC_SUPABASE_ANON_KEY") },
        {
          label: "Service role key",
          configured: isConfigured("SUPABASE_SERVICE_ROLE_KEY"),
        },
      ],
    },
    {
      title: "AI providers",
      items: [
        { label: "OpenAI API key", configured: isConfigured("OPENAI_API_KEY") },
        {
          label: "Anthropic (Claude) API key",
          configured: isConfigured("ANTHROPIC_API_KEY"),
        },
      ],
    },
    {
      title: "n8n",
      items: [
        { label: "Callback secret", configured: isConfigured("N8N_CALLBACK_SECRET") },
        { label: "Base URL", configured: isConfigured("N8N_BASE_URL") },
        { label: "Webhook secret", configured: isConfigured("N8N_WEBHOOK_SECRET") },
      ],
    },
    {
      title: "Video Worker",
      items: [
        { label: "Worker URL", configured: isConfigured("VIDEO_WORKER_URL") },
        { label: "Worker secret", configured: isConfigured("VIDEO_WORKER_SECRET") },
      ],
    },
  ];
}
