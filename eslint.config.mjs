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
  ]),
  {
    rules: {
      "no-restricted-imports": ["error", {
        paths: [
          {
            name: "@anthropic-ai/sdk",
            message: "Import from '@/lib/usage/anthropic' instead — direct SDK import bypasses cost logging.",
          },
          {
            name: "@google/genai",
            message: "Import from '@/lib/usage/gemini' instead — direct SDK import bypasses cost logging.",
          },
          {
            name: "@/lib/ai/client",
            message: "Import from '@/lib/usage/anthropic' instead — old wrapper bypasses cost logging.",
          },
          {
            name: "@/lib/seo/client",
            message: "Import from '@/lib/usage/dataforseo' instead — old wrapper bypasses cost logging.",
          },
        ],
      }],
    },
  },
  {
    files: ["lib/usage/**/*.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
]);

export default eslintConfig;
