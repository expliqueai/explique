import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      typography: {
        userMessage: {
          css: {
            "--tw-prose-body": "white",
            "--tw-prose-headings": "white",
            "--tw-prose-lead": "rgba(255, 255, 255, 0.85)",
            "--tw-prose-links": "white",
            "--tw-prose-bold": "white",
            "--tw-prose-counters": "rgba(255, 255, 255, 0.75)",
            "--tw-prose-bullets": "rgba(255, 255, 255, 0.75)",
            "--tw-prose-hr": "rgba(255, 255, 255, 0.4)",
            "--tw-prose-quotes": "rgba(255, 255, 255, 0.85)",
            "--tw-prose-quote-borders": "#9333ea",
            "--tw-prose-captions": "rgba(255, 255, 255, 0.7)",
            "--tw-prose-code": "white",
            "--tw-prose-pre-code": "rgba(255, 255, 255, 0.9)",
            "--tw-prose-pre-bg": "rgba(26, 14, 46, 0.4)",
            "--tw-prose-th-borders": "rgba(255, 255, 255, 0.4)",
            "--tw-prose-td-borders": "rgba(255, 255, 255, 0.2)",
            color: "white",
            maxWidth: "none",
          },
        },
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("tailwindcss-animate"),
    require("@tailwindcss/forms")({
      strategy: "class",
    }),
  ],
};
export default config;
