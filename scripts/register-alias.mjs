// Registers the "@/" alias resolution hook for the current Node process.
// Used via `node --import ./scripts/register-alias.mjs ...`.
import { register } from "node:module";

register("./alias-loader.mjs", import.meta.url);
