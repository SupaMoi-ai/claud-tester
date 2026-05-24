import type { MetadataRoute } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FARÉ — Vintage Operator OS",
    short_name: "FARÉ",
    description: "Past, present, future — one piece at a time.",
    start_url: `${basePath}/`,
    scope: `${basePath}/`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f0e8",
    theme_color: "#0f0d0b",
    categories: ["productivity", "business", "lifestyle"],
    icons: [
      {
        src: `${basePath}/icons/icon.svg`,
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: `${basePath}/icons/icon-maskable.svg`,
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
