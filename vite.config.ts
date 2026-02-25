import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/` : "/",
  server: {
    watch: {
      usePolling: true,
    },
  },
});
