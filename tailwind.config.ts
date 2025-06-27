import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
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
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
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
