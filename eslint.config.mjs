import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "**/._*",
    // The design prototype is loaded as ordered browser-global Babel scripts
    // from public/design/*.html, not as imported Next/React modules.
    "public/design/app/**",
  ]),
]);

export default eslintConfig;
