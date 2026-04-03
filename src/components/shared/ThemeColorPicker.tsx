"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import { motion } from "framer-motion";
import { Palette, Check, SlidersHorizontal, Hash, Heart } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { hexToOklch, oklchToHex } from "@/lib/color-utils";

/**
 * Componente: ThemeColorPicker (Studio Pro v2 + Library)
 * Inclui área 2D Pro, Hex Authority e Biblioteca de Favoritos.
 * Design Unificado: "The Studio".
 */

const DEFAULT_SUGGESTIONS = [
  { h: 45, c: 0.19, l: 0.65 },  // Orange
  { h: 250, c: 0.19, l: 0.65 }, // Blue
  { h: 145, c: 0.19, l: 0.65 }, // Green
  { h: 300, c: 0.19, l: 0.65 }, // Purple
  { h: 340, c: 0.19, l: 0.65 }, // Pink
  { h: 95, c: 0.19, l: 0.65 },  // Yellow
];

export function ThemeColorPicker() {
  const {
    accentHue, accentChroma, accentLuminance, favoriteColors,
    setAccentHue, setAccentColor, toggleFavorite
  } = useAppStore();

  const [hexInput, setHexInput] = useState("");
  const [isValidHex, setIsValidHex] = useState(true);
  const [isFocused, setIsFocused] = useState(false);

  // Check if current color is favorited
  const isCurrentFavorite = favoriteColors.some(
    f => f.h === accentHue && f.c === accentChroma && f.l === accentLuminance
  );

  // Sync Input Hex (Only when NOT typing to avoid fighting the user)
  useEffect(() => {
    if (isFocused) return;
    const currentHex = oklchToHex(accentLuminance, accentChroma, accentHue);
    // Only update if it's actually different to avoid unnecessary resets
    if (hexInput !== currentHex.toUpperCase()) {
      setHexInput(currentHex.toUpperCase());
    }
  }, [accentHue, accentChroma, accentLuminance, isFocused, hexInput]);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase();

    // Only allow Hex characters and #
    const allowedCharsRegex = /^[0-9A-F#]*$/;
    if (!allowedCharsRegex.test(value)) return;

    // Limit length to 7 characters
    if (value.length > 7) return;

    setHexInput(value);

    // Attempt parsing only valid 7-char strings
    if (value.startsWith("#") && value.length === 7) {
      const hexRegex = /^#([A-Fa-f0-9]{6})$/;
      if (hexRegex.test(value)) {
        const { h, c, l } = hexToOklch(value);
        setAccentColor(h, c, l);
        setIsValidHex(true);
      } else {
        setIsValidHex(false);
      }
    } else if (value.length === 6 && !value.startsWith("#")) {
      const fullHex = "#" + value;
      const hexRegex = /^#([A-Fa-f0-9]{6})$/;
      if (hexRegex.test(fullHex)) {
        const { h, c, l } = hexToOklch(fullHex);
        setAccentColor(h, c, l);
        setIsValidHex(true);
      } else {
        setIsValidHex(false);
      }
    } else {
      setIsValidHex(value.length < 8);
    }
  };

  const handleToggleFavorite = () => {
    toggleFavorite({ h: accentHue, c: accentChroma, l: accentLuminance });
  };

  const displayedColors = favoriteColors.length > 0 ? favoriteColors : DEFAULT_SUGGESTIONS;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button
          variant="ghost"
          size="icon"
          className="relative group w-10 h-10 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-300 active:scale-90"
        >
          <Palette className="w-5 h-5 text-zinc-500 dark:text-zinc-400 group-hover:text-primary transition-colors" />
          <motion.div
            layoutId="active-hue-dot"
            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-white dark:border-zinc-950 shadow-sm"
          />
        </Button>
      } />
      <DropdownMenuContent
        align="end"
        className="p-5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-700/50 rounded-[28px] shadow-2xl min-w-[300px] z-[100] space-y-6"
      >
        {/* Header Readout & Reset */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: `oklch(${accentLuminance} ${accentChroma} ${accentHue})` }} />
            <span className="text-[10px] font-mono font-black text-zinc-400 uppercase tracking-tight">
              oklch({accentLuminance.toFixed(2)}, {accentChroma.toFixed(2)}, {accentHue.toFixed(0)})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAccentColor(45, 0.19, 0.65)} className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 hover:text-primary transition-colors">Reset</button>
          </div>
        </div>

        {/* Dual Linear Controls */}
        <div className="space-y-6 pt-2">
          {/* Main Action: Save/Remove */}
          <Button
            onClick={handleToggleFavorite}
            className={`w-full h-12 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all duration-300 shadow-lg ${isCurrentFavorite
              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 shadow-none"
              : "bg-primary text-white shadow-primary/20 hover:scale-[1.02] active:scale-95"
              }`}
          >
            <Heart size={14} className="mr-2" fill={isCurrentFavorite ? "currentColor" : "none"} />
            {isCurrentFavorite ? "Remover da Biblioteca" : "Salvar na Biblioteca"}
          </Button>

          {/* Hue Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 text-[9px] font-black uppercase tracking-widest text-zinc-400 font-sans">
              <span>Selecione a Cor (Hue)</span>
              <span>{Math.round(accentHue)}°</span>
            </div>
            <div className="relative group/slider px-1">
              <div
                className="absolute inset-x-1 h-3 top-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                style={{
                  background: `linear-gradient(to right, 
                    oklch(0.7 0.19 0), 
                    oklch(0.7 0.19 45), 
                    oklch(0.7 0.19 90), 
                    oklch(0.7 0.19 145), 
                    oklch(0.7 0.19 200), 
                    oklch(0.7 0.19 250), 
                    oklch(0.7 0.19 300), 
                    oklch(0.7 0.19 360)
                  )`
                }}
              />
              <input
                type="range"
                min="0"
                max="360"
                step="0.1"
                value={accentHue}
                onChange={(e) => setAccentHue(Number(e.target.value))}
                className="relative w-full h-3 appearance-none cursor-pointer focus:outline-none bg-transparent"
                style={{ WebkitAppearance: "none" }}
              />
            </div>
          </div>

          {/* Tone/Luminance Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 text-[9px] font-black uppercase tracking-widest text-zinc-400 font-sans">
              <span>Ajuste de Tom (Luminância)</span>
              <span>{Math.round(accentLuminance * 100)}%</span>
            </div>
            <div className="relative group/slider px-1">
              <div
                className="absolute inset-x-1 h-3 top-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                style={{
                  background: `linear-gradient(to right, 
                    oklch(0.40 ${accentChroma} ${accentHue}), 
                    oklch(0.65 ${accentChroma} ${accentHue}), 
                    oklch(0.85 ${accentChroma} ${accentHue})
                  )`
                }}
              />
              <input
                type="range"
                min="0.40"
                max="0.85"
                step="0.01"
                value={accentLuminance}
                onChange={(e) => setAccentColor(accentHue, 0.19, Number(e.target.value))}
                className="relative w-full h-3 appearance-none cursor-pointer focus:outline-none bg-transparent"
                style={{ WebkitAppearance: "none" }}
              />
            </div>
          </div>
        </div>

        <DropdownMenuSeparator className="bg-zinc-100/50 dark:bg-zinc-800" />

        <div className="grid grid-cols-2 gap-4">
          {/* Hex Input */}
          <div className="space-y-2 flex flex-col justify-end">
            <div className="flex items-center gap-1 px-1 mb-1">
              <Hash size={10} className="text-zinc-300" />
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 font-sans">Hex</span>
            </div>
            <input
              type="text"
              value={hexInput}
              onChange={handleHexChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => e.stopPropagation()} // Stop Radix from stealing key events (type-ahead)
              onPointerDown={(e) => e.stopPropagation()} // Prevent focus management issues
              className={`w-full bg-zinc-50 dark:bg-zinc-800/50 border ${isValidHex ? "border-zinc-100 dark:border-zinc-800" : "border-red-400/50"} rounded-xl px-3 py-2 text-[10px] font-mono font-bold focus:outline-none transition-all cursor-text relative z-10`}
            />
          </div>
          {/* Personal Library (Favorites) */}
          <div className="space-y-2 flex flex-col justify-end">
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 px-1 font-sans">
              {favoriteColors.length > 0 ? "Biblioteca" : "Sugestões"}
            </span>
            <div className="grid grid-cols-6 gap-1.5 h-fit">
              {displayedColors.slice(0, 18).map((c, i) => (
                <button
                  key={`${c.h}-${i}`}
                  onClick={() => setAccentColor(c.h, c.c, c.l)}
                  className="w-full aspect-square rounded-md shadow-sm transition-transform active:scale-90 border border-black/5"
                  style={{ backgroundColor: oklchToHex(c.l, c.c, c.h) }}
                >
                  {accentHue === c.h && accentChroma === c.c && accentLuminance === c.l && (
                    <div className="w-full h-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white drop-shadow-sm" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
