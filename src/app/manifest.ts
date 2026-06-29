import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GA BA Regieberichte",
    short_name: "GA BA",
    description: "Regieberichte Gandola & Battaini AG",
    start_url: "/",
    display: "standalone",
    background_color: "#1a2a8f",
    theme_color: "#1a2a8f",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
