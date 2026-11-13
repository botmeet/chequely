"use client";

import React, { useState } from "react";
import {
  Palette,
  Lightbulb,
  Sun,
  Moon,
  Laptop,
  Check,
  ChevronDown,
  Sparkles,
  CreditCard,
  Receipt,
  ArrowDownLeft,
} from "lucide-react";
import { useTheme, ThemeMode, ColorThemeId } from "@/components/theme/theme-context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function PixelThemeSettings() {
  const { themeMode, setThemeMode, colorTheme, setColorTheme, colors, resolvedMode } =
    useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const modeOptions: { id: ThemeMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "system", label: "System", icon: Laptop },
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
  ];

  const currentModeOption = modeOptions.find((m) => m.id === themeMode) || modeOptions[0];
  const CurrentIcon = currentModeOption.icon;

  return (
    <Card className="rounded-3xl border border-zinc-200 dark:border-zinc-800/80 bg-white/95 dark:bg-[#18181b] shadow-sm overflow-hidden">
      <CardHeader className="pb-3 pt-5 px-5 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold tracking-tight">
                Wallpaper & Style (AOSP / Pixel UI)
              </CardTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Material You dynamic accent palette and theme mode
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="rounded-full text-[11px] px-3 py-1 font-semibold uppercase tracking-wider border-primary/30 text-primary"
          >
            {colors.find((c) => c.id === colorTheme)?.name || "Theme"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-5 sm:px-6 pb-6">
        {/* Row 1: AOSP / Pixel Color Circles Swatches (exact layout matching screenshot) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Accent Palette ({colors.length} Colors)
            </span>
            <span className="text-[11px] text-zinc-400">Scroll to explore</span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto py-2.5 px-1 scrollbar-thin">
            {colors.map((c) => {
              const isSelected = colorTheme === c.id;

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColorTheme(c.id)}
                  title={`${c.name} (${c.paletteType})`}
                  className="group relative flex flex-col items-center gap-1.5 shrink-0 cursor-pointer focus:outline-none transition-transform hover:scale-105 active:scale-95 py-1"
                >
                  {/* Outer ring on selected circle (as in screenshot) */}
                  <div
                    className={`flex h-14 w-14 sm:h-15 sm:w-15 items-center justify-center rounded-full transition-all duration-200 ${
                      isSelected
                        ? "ring-3 ring-offset-2 ring-primary dark:ring-offset-[#18181b]"
                        : "ring-0"
                    }`}
                  >
                    {/* Inner Solid Color Circle */}
                    <div
                      className="flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-full shadow-sm transition-transform"
                      style={{ backgroundColor: c.hex }}
                    >
                      {/* Palette icon on selected circle (matching screenshot) */}
                      {isSelected ? (
                        <Palette className="h-5 w-5 text-white drop-shadow-md animate-in zoom-in-75" />
                      ) : null}
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-medium transition-colors ${
                      isSelected ? "text-primary font-bold" : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Theme Mode Row (Lightbulb icon, "Theme Mode", Pill Dropdown matching screenshot) */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
              <Lightbulb className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">Theme Mode</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {themeMode === "system"
                  ? `Following system (${resolvedMode} active)`
                  : `${themeMode.charAt(0).toUpperCase() + themeMode.slice(1)} mode selected`}
              </p>
            </div>
          </div>

          {/* Clean Pixel Pill Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-zinc-900 dark:text-zinc-100 font-semibold text-sm px-4 py-2.5 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs"
            >
              <CurrentIcon className="h-4 w-4 text-primary" />
              <span>{currentModeOption.label}</span>
              <ChevronDown className="h-4 w-4 opacity-60 ml-0.5" />
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 z-50 w-36 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xl p-1.5 space-y-1 animate-in fade-in zoom-in-95">
                  {modeOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = themeMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setThemeMode(opt.id);
                          setDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl text-left cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground font-bold shadow-xs"
                            : "hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5" />
                          <span>{opt.label}</span>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Live Pixel UI Component Preview Card */}
        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-500 dark:text-zinc-400">
              Pixel UI Live Preview
            </span>
            <span className="text-[11px] text-primary font-bold">
              Active Accent
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Sample Action Button */}
            <div className="p-3 rounded-xl bg-white dark:bg-zinc-800/90 border border-zinc-200/60 dark:border-zinc-700/60 space-y-2">
              <span className="text-[11px] text-zinc-400 block">Button & Pill Chip</span>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" className="rounded-full shadow-xs">
                  Primary Action
                </Button>
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold">
                  <Sparkles className="h-3 w-3" />
                  Pill Chip
                </div>
              </div>
            </div>

            {/* Sample Cheque Card */}
            <div className="p-3 rounded-xl bg-white dark:bg-zinc-800/90 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Cheque #000456
                  </p>
                  <p className="text-[10px] text-zinc-500">₹45,000.00</p>
                </div>
              </div>
              <Badge variant="outline" className="border-primary/40 text-primary text-[10px] rounded-full">
                Active
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

