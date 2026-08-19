# Prompt storage note (CONFIRMED)

Telemetry stores only:
- input_summary / output_summary (short labels)
- token counts, cost, duration, temperature, max_tokens
- measured_output for some deterministic steps (not always present)

Telemetry does NOT store:
- exact assembled system/user prompts
- raw model responses
- per-image provider request bodies
- JSON repair broken raw payloads
- discarded package drafts from failed attempts

RECONSTRUCTED prompts must be built from current code + stored package fields.
Code versions at audit time may differ slightly from production deploy at run time.
