import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      external: ["@prisma/client"]
    },
    server: {
      watch: {
        ignored: ["**/prisma/**", "**/*.db", "**/*.sqlite"],
      }
    }
  },
  ssr: true,
});
