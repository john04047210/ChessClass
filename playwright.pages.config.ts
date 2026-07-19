import { defineConfig, devices } from "@playwright/test";

process.env.E2E_BASE_PATH = "/ChessClass";

export default defineConfig({
  testDir:"./src/tests/e2e",
  timeout:45_000,
  use:{baseURL:"http://127.0.0.1:4175",trace:"retain-on-failure"},
  projects:[{name:"github-pages-chromium",use:{...devices["Desktop Chrome"]}}],
  webServer:{
    command:"/Users/qiaopeng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/serve-pages-preview.mjs",
    url:"http://127.0.0.1:4175/ChessClass/",
    reuseExistingServer:false,
    timeout:30_000,
  },
});
