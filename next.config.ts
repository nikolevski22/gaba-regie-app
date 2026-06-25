import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone-Output für schlanke Docker-Images (Coolify / Railway).
  output: "standalone",
  serverExternalPackages: ["playwright", "@prisma/client", "bcryptjs"],
  experimental: {
    serverActions: {
      // Baustellenfotos können grösser sein.
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
