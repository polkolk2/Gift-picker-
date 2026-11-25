import type { MetadataRoute } from "next";

/** Lets phones install Gift4Me to the home screen as its own full-screen app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gift4Me",
    short_name: "Gift4Me",
    description: "Never miss a birthday. Pick and send the right gift in a few taps.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F7F6F9",
    theme_color: "#6A4CE8",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
