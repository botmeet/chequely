"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "system" | "light" | "dark";

export type ColorThemeId =
  | "lavender"
  | "green"
  | "teal"
  | "cyan"
  | "blue"
  | "indigo"
  | "plum"
  | "emerald"
  | "lime"
  | "coral"
  | "peach"
  | "amber"
  | "gold"
  | "crimson"
  | "rose"
  | "charcoal";

export interface ColorThemeOption {
  id: ColorThemeId;
  name: string;
  hex: string; // Swatch preview color
  darkHex: string;
  paletteType: string;
}

export const COLOR_THEMES: ColorThemeOption[] = [
  {
    id: "lavender",
    name: "Lavender",
    hex: "#8B5CF6", // Lavender / Violet matching image
    darkHex: "#C4B5FD",
    paletteType: "AOSP Violet",
  },
  {
    id: "green",
    name: "Mint",
    hex: "#4CAF50", // Green circle in image
    darkHex: "#81C784",
    paletteType: "Pixel Mint",
  },
  {
    id: "teal",
    name: "Teal",
    hex: "#14B8A6", // Teal circle in image
    darkHex: "#5EEAD4",
    paletteType: "AOSP Seafoam",
  },
  {
    id: "cyan",
    name: "Cyan",
    hex: "#06B6D4", // Cyan circle in image
    darkHex: "#67E8F9",
    paletteType: "Pixel Glacier",
  },
  {
    id: "blue",
    name: "Blue",
    hex: "#3B82F6", // Blue circle in image
    darkHex: "#93C5FD",
    paletteType: "Pixel Sky",
  },
  {
    id: "indigo",
    name: "Indigo",
    hex: "#6366F1",
    darkHex: "#A5B4FC",
    paletteType: "AOSP Deep Sea",
  },
  {
    id: "plum",
    name: "Plum",
    hex: "#A855F7",
    darkHex: "#D8B4FE",
    paletteType: "Pixel Orchid",
  },
  {
    id: "emerald",
    name: "Emerald",
    hex: "#10B981",
    darkHex: "#34D399",
    paletteType: "Pixel Forest",
  },
  {
    id: "lime",
    name: "Lime",
    hex: "#84CC16",
    darkHex: "#A3E635",
    paletteType: "AOSP Pistachio",
  },
  {
    id: "coral",
    name: "Coral",
    hex: "#F97316",
    darkHex: "#FDBA74",
    paletteType: "AOSP Sunset",
  },
  {
    id: "peach",
    name: "Peach",
    hex: "#FB923C",
    darkHex: "#FED7AA",
    paletteType: "Pixel Terracotta",
  },
  {
    id: "amber",
    name: "Amber",
    hex: "#F59E0B",
    darkHex: "#FCD34D",
    paletteType: "Pixel Citron",
  },
  {
    id: "gold",
    name: "Gold",
    hex: "#EAB308",
    darkHex: "#FDE047",
    paletteType: "AOSP Sunburst",
  },
  {
    id: "crimson",
    name: "Crimson",
    hex: "#EF4444",
    darkHex: "#F87171",
    paletteType: "Pixel Poppy",
  },
  {
    id: "rose",
    name: "Rose",
    hex: "#EC4899",
    darkHex: "#F472B6",
    paletteType: "Pixel Flamingo",
  },
  {
    id: "charcoal",
    name: "Charcoal",
    hex: "#4B5563",
    darkHex: "#9CA3AF",
    paletteType: "Pixel Obsidian",
  },
];

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  colorTheme: ColorThemeId;
  setColorTheme: (color: ColorThemeId) => void;
  resolvedMode: "light" | "dark";
  colors: ColorThemeOption[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_MODE_KEY = "chequely-theme-mode";
const THEME_COLOR_KEY = "chequely-theme-color";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [colorTheme, setColorThemeState] = useState<ColorThemeId>("lavender");
  const [resolvedMode, setResolvedMode] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  // Initialize from localStorage or defaults
  useEffect(() => {
    const savedMode = (localStorage.getItem(THEME_MODE_KEY) as ThemeMode) || "system";
    const savedColor = (localStorage.getItem(THEME_COLOR_KEY) as ColorThemeId) || "lavender";

    setThemeModeState(savedMode);
    setColorThemeState(savedColor);
    setMounted(true);
  }, []);

  // Update DOM when mode or system preferences change
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const isDark =
        themeMode === "dark" || (themeMode === "system" && mediaQuery.matches);

      setResolvedMode(isDark ? "dark" : "light");

      const root = document.documentElement;
      if (isDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }

      root.setAttribute("data-theme-color", colorTheme);
    };

    applyTheme();

    const handler = () => {
      if (themeMode === "system") {
        applyTheme();
      }
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [themeMode, colorTheme, mounted]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem(THEME_MODE_KEY, mode);
  };

  const setColorTheme = (color: ColorThemeId) => {
    setColorThemeState(color);
    localStorage.setItem(THEME_COLOR_KEY, color);
    document.documentElement.setAttribute("data-theme-color", color);
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        setThemeMode,
        colorTheme,
        setColorTheme,
        resolvedMode,
        colors: COLOR_THEMES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

