import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir:"./src/tests/e2e",
  timeout:45_000,
  use:{baseURL:"http://localhost:4174",trace:"retain-on-failure"},
  projects:[{name:"static-chromium",use:{...devices["Desktop Chrome"]}}],
  webServer:{
    command:"/Users/qiaopeng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/serve/build/main.js out --listen 4174 --no-clipboard",
    url:"http://localhost:4174",
    reuseExistingServer:false,
    timeout:30_000,
  },
});
