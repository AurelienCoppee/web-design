import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    ssr: { external: ["@prisma/client"] }
  },
  ssr: true,
});
