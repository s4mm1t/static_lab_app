import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TrackFood AI",
    short_name: "TrackFood",
    description: "Mobile-first nutrition tracking app.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f7",
    theme_color: "#101010",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.svg",
        sizes: "180x180",
        type: "image/svg+xml",
      },
    ],
  };
}
