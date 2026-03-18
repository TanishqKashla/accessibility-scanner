import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "var(--color-primary)",
                "primary-hover": "var(--color-primary-hover)",
                "primary-light": "var(--color-primary-light)",
                "primary-50": "var(--color-primary-50)",
                background: "var(--color-background)",
                card: "var(--color-card)",
                border: "var(--color-border)",
                "border-light": "var(--color-border-light)",
                foreground: "var(--color-foreground)",
                muted: "var(--color-muted)",
                "muted-light": "var(--color-muted-light)",
                navbar: "var(--color-navbar)",
                "navbar-text": "var(--color-navbar-text)",
                sidebar: "var(--color-sidebar)",
                "sidebar-hover": "var(--color-sidebar-hover)",
                "sidebar-active": "var(--color-sidebar-active)",
                "sidebar-active-text": "var(--color-sidebar-active-text)",
                "sidebar-active-border": "var(--color-sidebar-active-border)",
                critical: "var(--color-critical)",
                "critical-bg": "var(--color-critical-bg)",
                serious: "var(--color-serious)",
                "serious-bg": "var(--color-serious-bg)",
                moderate: "var(--color-moderate)",
                "moderate-bg": "var(--color-moderate-bg)",
                minor: "var(--color-minor)",
                "minor-bg": "var(--color-minor-bg)",
                pass: "var(--color-pass)",
                "pass-bg": "var(--color-pass-bg)",
                fail: "var(--color-fail)",
                "fail-bg": "var(--color-fail-bg)",
                partial: "var(--color-partial)",
                "partial-bg": "var(--color-partial-bg)",
            },
            boxShadow: {
                card: "var(--shadow-card)",
                "card-hover": "var(--shadow-card-hover)",
                navbar: "var(--shadow-navbar)",
            },
            borderRadius: {
                sm: "var(--radius-sm)",
                md: "var(--radius-md)",
                lg: "var(--radius-lg)",
                full: "var(--radius-full)",
            },
            spacing: {
                18: "var(--spacing-18)",
                88: "var(--spacing-88)",
            },
            fontFamily: {
                sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
            },
        },
    },
    plugins: [],
};

export default config;
