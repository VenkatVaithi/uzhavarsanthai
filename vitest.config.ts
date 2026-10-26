import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    clearMocks: true,
    include: ["artifacts/**/*.test.{ts,tsx}"],
  },
});