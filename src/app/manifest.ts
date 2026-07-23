import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "棋路 · 国际象棋陪练",
    short_name: "棋路",
    description: "面向零基础玩家的免费国际象棋陪练",
    start_url: ".",
    display: "standalone",
    background_color: "#f5f1e8",
    theme_color: "#1f6248",
    icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
