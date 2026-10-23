// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");
// 서식 규칙은 prettier 에 맡긴다 — eslint 의 서식 규칙을 꺼서 둘이 싸우지 않게 한다. 반드시 마지막에.
const prettierConfig = require("eslint-config-prettier/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // supabase/functions 는 Deno 런타임(URL import) — 앱 린트 대상이 아니다
    ignores: ["dist/*", "coverage/*", "supabase/functions/**"],
  },
  {
    // jest 전역(describe/it/expect/jest)을 안다
    files: ["__tests__/**", "**/*.test.{ts,tsx}"],
    languageOptions: { globals: { describe: "readonly", it: "readonly", expect: "readonly", jest: "readonly", beforeEach: "readonly", afterAll: "readonly" } },
  },
  prettierConfig,
]);
