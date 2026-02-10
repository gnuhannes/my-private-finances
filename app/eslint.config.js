import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      eslintConfigPrettier,
    ],
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Layering / dependency direction rules
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            // lib must not import UI layers
            {
              target: "./src/lib",
              from: ["./src/pages", "./src/components", "./src/hooks"],
            },
            // hooks must not import pages/components
            {
              target: "./src/hooks",
              from: ["./src/pages", "./src/components"],
            },
            // components must not import pages
            {
              target: "./src/components",
              from: ["./src/pages"],
            },
            // utils should stay pure
            {
              target: "./src/utils",
              from: ["./src/lib", "./src/pages", "./src/components", "./src/hooks"],
            },
          ],
        },
      ],
    },
  },
]);
