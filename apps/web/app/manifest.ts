import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Quickdash",
        short_name: "Quickdash",
        description: "Premium coffee and brewing gear.",
        start_url: "/",
        display: "standalone",
        background_color: "#000000",
        theme_color: "#000000",
    };
};