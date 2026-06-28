import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone-Output für schlanke Docker-Images (Coolify / Railway).
  output: "standalone",
  // ESLint-Stilregeln sollen den Produktions-Build nicht blockieren
  // (Typprüfung bleibt aktiv).
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ["playwright", "@prisma/client", "bcryptjs"],
  experimental: {
    serverActions: {
      // Baustellenfotos können grösser sein.
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
