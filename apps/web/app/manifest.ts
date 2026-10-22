import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VinaCook",
    short_name: "VinaCook",
    description: "Đặt mì, bún, phở tươi giao tận nơi",
    lang: "vi",
    start_url: "/",
    display: "standalone",
    background_color: "#f9f7f3",
    theme_color: "#f54a00",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
