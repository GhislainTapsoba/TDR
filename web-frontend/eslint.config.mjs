import globals from "globals";
import js from "@eslint/js";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks"; // Common for React projects
import next from "@next/eslint-plugin-next"; // This is the actual Next.js plugin for v9

export default [
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 2020,
        sourceType: "module",
        project: ["./tsconfig.json"],
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslint,
      react: react,
      "react-hooks": reactHooks,
      "@next/next": next, // Use the official Next.js plugin for v9
    },
    rules: {
      ...typescriptEslint.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...next.configs.recommended.rules, // Recommended rules for Next.js
      ...next.configs["core-web-vitals"].rules, // Core Web Vitals rules for Next.js

      // Custom rules (adjust as needed)
      "react/react-in-jsx-scope": "off", // Next.js doesn't require React to be in scope
      "@typescript-eslint/explicit-module-boundary-types": "off", // Adjust based on project needs
      "@typescript-eslint/no-explicit-any": "off", // Often useful in migration or specific cases
      "@next/next/no-img-element": "off", // If you use <img> directly
    },
    settings: {
      react: {
        version: "detect", // Automatically detect the React version
      },
    },
  },
  {
    // Ignore patterns similar to .eslintignore
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "node_modules/**",
      "next-env.d.ts",
      "*.js", // If you only want to lint ts/tsx
      "*.mjs",
      "*.cjs"
    ],
  },
];