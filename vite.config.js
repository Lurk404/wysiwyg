import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves this project at https://lurk404.github.io/wysiwyg/,
// so built asset URLs need the repo name as their base path.
export default defineConfig({
  plugins: [react()],
  base: "/wysiwyg/",
});
