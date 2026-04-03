/**
 * EmbedLayout
 *
 * Minimal layout for embedded nanopub views. Provides only the essential
 * providers (theme, tooltips, toaster) without the app shell (no navbar,
 * no auth provider, no missing-email dialog).
 *
 * Style customization is supported via query params:
 *   ?theme=dark|light    - Force a theme (default: system preference)
 *   ?primaryColor=hex    - Override the primary accent color
 *   ?borderRadius=px     - Override border radius
 */

import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { Outlet, useSearchParams } from "react-router-dom";
import { EmbedProvider } from "./EmbedContext";

/**
 * Convert a hex color (e.g. "0f4e8a") to an oklch() string.
 * Uses a simple sRGB→oklch approximation via the browser's CSS engine.
 */
function hexToOklch(hex: string): string | null {
  if (typeof document === "undefined") return null;
  const el = document.createElement("div");
  el.style.color = `#${hex}`;
  document.body.appendChild(el);
  const computed = getComputedStyle(el).color;
  document.body.removeChild(el);

  // Parse rgb(r, g, b) from computed style
  const match = computed.match(/(\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;

  const [r, g, b] = [
    Number(match[1]) / 255,
    Number(match[2]) / 255,
    Number(match[3]) / 255,
  ];

  // sRGB → linear
  const lin = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const lr = lin(r),
    lg = lin(g),
    lb = lin(b);

  // Linear sRGB → OKLab
  const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s_ = 0.0883024619 * lr + 0.2220049412 * lg + 0.6716926969 * lb;

  const l = Math.cbrt(l_),
    m = Math.cbrt(m_),
    s = Math.cbrt(s_);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bOk = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const C = Math.sqrt(a * a + bOk * bOk);
  const h = (Math.atan2(bOk, a) * 180) / Math.PI;

  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${h < 0 ? h + 360 : h})`;
}

function useStyleCustomization() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const styleId = "nanopub-embed-custom-styles";

    // Remove any previous custom style element
    document.getElementById(styleId)?.remove();

    const overrides: string[] = [];

    const primaryColor = searchParams.get("primaryColor");
    if (primaryColor) {
      const oklch = hexToOklch(primaryColor);
      if (oklch) {
        overrides.push(`--primary: ${oklch} !important`);
        overrides.push(`--accent: ${oklch} !important`);
        overrides.push(`--ring: ${oklch} !important`);
        overrides.push(`--chart-1: ${oklch} !important`);
      }
    }

    const bgColor = searchParams.get("bgColor");
    if (bgColor) {
      const oklch = hexToOklch(bgColor);
      if (oklch) {
        overrides.push(`--background: ${oklch} !important`);
      }
    }

    const cardColor = searchParams.get("cardColor");
    if (cardColor) {
      const oklch = hexToOklch(cardColor);
      if (oklch) {
        overrides.push(`--card: ${oklch} !important`);
      }
    }

    const fgColor = searchParams.get("fgColor");
    if (fgColor) {
      const oklch = hexToOklch(fgColor);
      if (oklch) {
        overrides.push(`--foreground: ${oklch} !important`);
        overrides.push(`--card-foreground: ${oklch} !important`);
      }
    }

    const borderRadius = searchParams.get("borderRadius");
    if (borderRadius) {
      overrides.push(`--radius: ${borderRadius}px !important`);
    }

    if (overrides.length > 0 || primaryColor) {
      const style = document.createElement("style");
      style.id = styleId;
      let css = "";

      if (overrides.length > 0) {
        css += `:root, .dark { ${overrides.join("; ")}; }`;
      }

      // When primaryColor is set in embed mode, override all per-template
      // accent colors so the entire view matches the organization's branding.
      // On the main platform these stay as per-template colors for variety.
      if (primaryColor) {
        const hex = `#${primaryColor}`;
        css += `
          /* Template card accent borders */
          [class*="border-l-violet-"], [class*="border-l-cyan-"],
          [class*="border-l-amber-"], [class*="border-l-emerald-"],
          [class*="border-l-rose-"], [class*="border-l-teal-"],
          [class*="border-l-indigo-"], [class*="border-l-sky-"],
          [class*="border-l-blue-"], [class*="border-l-purple-"],
          [class*="border-l-yellow-"] {
            border-left-color: ${hex} !important;
          }
          /* Template icon and inner accent text colors */
          [class*="text-violet-"], [class*="text-cyan-"],
          [class*="text-amber-"], [class*="text-emerald-"],
          [class*="text-rose-"], [class*="text-teal-"],
          [class*="text-indigo-"], [class*="text-sky-"] {
            color: ${hex} !important;
          }
          /* Template inner accent borders */
          [class*="border-violet-"], [class*="border-cyan-"],
          [class*="border-amber-"], [class*="border-emerald-"],
          [class*="border-rose-"], [class*="border-teal-"],
          [class*="border-indigo-"] {
            border-color: ${hex}40 !important;
          }
          /* Template accent backgrounds */
          [class*="bg-violet-50"], [class*="bg-cyan-50"],
          [class*="bg-amber-50"], [class*="bg-emerald-50"],
          [class*="bg-rose-50"], [class*="bg-teal-50"],
          [class*="bg-indigo-50"] {
            background-color: ${hex}15 !important;
          }
          .dark [class*="bg-violet-950"], .dark [class*="bg-cyan-950"],
          .dark [class*="bg-amber-950"], .dark [class*="bg-emerald-950"],
          .dark [class*="bg-rose-950"], .dark [class*="bg-teal-950"],
          .dark [class*="bg-indigo-950"] {
            background-color: ${hex}20 !important;
          }
        `;
      }

      style.textContent = css;
      document.head.appendChild(style);
    }

    return () => {
      document.getElementById(styleId)?.remove();
    };
  }, [searchParams]);
}

function useIframeResize() {
  useEffect(() => {
    const sendHeight = () => {
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage({ type: "nanopub-embed-resize", height }, "*");
    };

    // Send initial height and on resize
    sendHeight();
    const observer = new ResizeObserver(sendHeight);
    observer.observe(document.body);

    return () => observer.disconnect();
  }, []);
}

export function EmbedLayout() {
  const [searchParams] = useSearchParams();
  const theme = searchParams.get("theme") as "dark" | "light" | null;

  const platformUrl =
    import.meta.env.VITE_APP_URL || window.location.origin;

  useStyleCustomization();
  useIframeResize();

  return (
    <ThemeProvider
      defaultTheme={theme || "system"}
      storageKey="nanopub-embed-theme"
    >
      <TooltipProvider>
        <EmbedProvider platformUrl={platformUrl}>
          <div className="p-2">
            <Outlet />
          </div>
        </EmbedProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
