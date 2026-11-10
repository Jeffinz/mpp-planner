// ABOUTME: ESLint flat config for the browser app, Node scripts, and tests.
// ABOUTME: Browser code under js/ gets browser globals; scripts/ and tests/ get Node globals.
import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/", "backups/"] },
  js.configs.recommended,
  { files: ["js/**/*.js"], languageOptions: { globals: globals.browser } },
  {
    files: ["scripts/**/*.mjs", "tests/**/*.js", "eslint.config.js"],
    languageOptions: { globals: globals.node },
  },
];
