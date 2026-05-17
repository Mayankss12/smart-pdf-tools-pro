import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          base: "var(--cream-base)",
          secondary: "var(--cream-secondary)",
          border: "var(--cream-border)",
          hover: "var(--cream-hover)",
        },
        violetBrand: {
          50: "var(--violet-50)",
          100: "var(--violet-100)",
          500: "var(--violet-500)",
          600: "var(--violet-600)",
          border: "var(--violet-border)",
        },
        ink: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          caption: "var(--text-caption)",
        },
        feedback: {
          successBg: "var(--success-bg)",
          successText: "var(--success-text)",
          errorBg: "var(--error-bg)",
          errorText: "var(--error-text)",
          warningBg: "var(--warning-bg)",
          warningText: "var(--warning-text)",
          betaBg: "var(--beta-bg)",
          betaText: "var(--beta-text)",
          soonBg: "var(--soon-bg)",
          soonText: "var(--soon-text)",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Plus Jakarta Sans", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        card: "var(--shadow-card)",
        focus: "var(--shadow-focus)",
      },
    },
  },
  plugins: [],
};

export default config;
