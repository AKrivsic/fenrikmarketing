// Minimal ESM resolution hook that maps the project's "@/" path alias
// (tsconfig paths) to the repo root, so TypeScript sources can be executed
// directly with Node's built-in type stripping — no extra dependency.
import { existsSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = process.cwd();

function resolveTsModulePath(basePath) {
  if (/\.[cm]?[jt]sx?$/.test(basePath)) return basePath;
  if (existsSync(`${basePath}.ts`)) return `${basePath}.ts`;
  const indexTs = join(basePath, "index.ts");
  if (existsSync(indexTs)) return indexTs;
  return `${basePath}.ts`;
}

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const target = resolveTsModulePath(resolvePath(root, specifier.slice(2)));
    return { url: pathToFileURL(target).href, shortCircuit: true };
  }

  // Native Node ESM requires explicit extensions; TS sources use extensionless
  // relative imports. Resolve them when the parent is a .ts module.
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !/\.[cm]?[jt]sx?$/.test(specifier) &&
    context.parentURL
  ) {
    const parentPath = fileURLToPath(context.parentURL);
    if (parentPath.endsWith(".ts")) {
      const candidate = resolveTsModulePath(
        resolvePath(dirname(parentPath), specifier),
      );
      if (existsSync(candidate)) {
        return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
    }
  }

  return nextResolve(specifier, context);
}
