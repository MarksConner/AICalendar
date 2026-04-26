import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    allowedHosts: ["p4demo-production.up.railway.app", "frontend-production-134c.up.railway.app"],
  },
  preview: {
    host: "0.0.0.0",
    port:  Number(process.env.PORT) || 8080,
    allowedHosts: ["p4demo-production.up.railway.app", "frontend-production-134c.up.railway.app"],
  },
});