import react from "@eslint-react/eslint-plugin";
import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import { defineConfig, globalIgnores } from "eslint/config";
import jsxA11y from "eslint-plugin-jsx-a11y-x";
import globals from "globals";
import tseslint from "typescript-eslint";

const sourceFiles = ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"];

export default defineConfig([
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ...react.configs["recommended-typescript"],
    files: sourceFiles,
  },
  {
    ...jsxA11y.configs.recommended,
    files: ["**/*.{jsx,tsx}"],
  },
  {
    ...nextPlugin.configs["core-web-vitals"],
    files: sourceFiles,
  },
  {
    files: sourceFiles,
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
