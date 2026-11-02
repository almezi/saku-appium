// ESLint flat config — the S2 lint layer (code_review.md).
// Conventions that were prose-only in AGENTS.md become machine-checked here:
//  - no Android/iOS page-object cross-imports (twin isolation invariant)
//  - no page-object cycles
//  - assertions go through expect(), not isDisplayed() branches (S8 house rule)
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";

const noAndroidPageImport = {
  patterns: [
    {
      // Matches both '../../pageobjects/x.page' and './x.page'. Excludes x.ios.page.
      // Type-only imports are allowed: shared input shapes (e.g. TransactionFormInput)
      // are platform-neutral by design.
      regex: `(?<!\\.ios)\\.page$`,
      allowTypeImports: true,
      message:
        "iOS files must not import Android page objects (twin isolation). Import shared tag maps from src/config/tags.ts instead (S5).",
    },
  ],
};

const noIosPageImport = {
  patterns: [
    {
      regex: `\\.ios\\.page$`,
      message: "Android files must not import iOS page objects (twin isolation).",
    },
  ],
};

// S8 house rule: isDisplayed() is a boolean branch, not an assertion.
// Assertions use expect(el).toBeDisplayed().
const noIsDisplayedCall = {
  // Only the assertion misuse is banned (S8); boolean branches on
  // isDisplayed() are legitimate control flow. Page-object methods may
  // call `isDisplayed()`; specs should use `expect(...).toBeDisplayed()`.
  selector: "CallExpression[callee.object.name='expect'][callee.property.name='isDisplayed']",
  message: "Assert with await expect(el).toBeDisplayed(), not isDisplayed() (S8).",
};

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "reports/**",
      "scripts/**", // tooling outside the harness source; run by node itself
      ".kilo/**",
      ".zcode/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    settings: {
      "import/resolver": {
        typescript: { alwaysTryTypes: true },
      },
    },
    plugins: { import: importPlugin },
    rules: {
      "import/no-cycle": "error",
    },
  },
  {
    // iOS page objects and iOS specs: no Android page-object imports.
    // kategori.ios / anggaran.ios tag-map cross-imports (S5) are the known offenders.
    files: ["src/pageobjects/*.ios.page.ts", "src/tests/**/*.ios.spec.ts"],
    rules: {
      "no-restricted-imports": ["error", noAndroidPageImport],
    },
  },
  {
    // Android page objects and Android specs: no iOS page-object imports.
    files: ["src/pageobjects/**/*.ts", "src/tests/**/*.spec.ts"],
    ignores: ["src/pageobjects/*.ios.page.ts", "src/tests/**/*.ios.spec.ts", "src/helpers/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", noIosPageImport],
    },
  },
  {
    // Specs: the S8 rule bites here; page objects may still branch on isDisplayed().
    files: ["src/tests/**/*.spec.ts"],
    rules: {
      "no-restricted-syntax": ["error", noIsDisplayedCall],
    },
  },
  {
    files: ["src/config/__tests__/*.test.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
);
