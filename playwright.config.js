// ABOUTME: Playwright config for end-to-end tests against the local Firebase emulators.
// ABOUTME: Run through scripts/test-e2e, which starts the emulators first.
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  workers: 1, // tests share one emulator database
  use: { baseURL: "http://127.0.0.1:4184", browserName: "chromium" },
  webServer: {
    command: "npx http-server -p 4184 -s -c-1",
    url: "http://127.0.0.1:4184",
    reuseExistingServer: false,
  },
});
