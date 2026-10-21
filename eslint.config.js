// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // supabase/functions 는 Deno 런타임(URL import) — 앱 린트 대상이 아니다
    ignores: ["dist/*", "supabase/functions/**"],
  }
]);
