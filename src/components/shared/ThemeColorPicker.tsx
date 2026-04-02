"use client";

import React from "react";
import { useAppStore } from "@/store/useAppStore";
import { motion } from "framer-motion";
import { Palette, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

/**
 * Componente: ThemeColorPicker
 * Permite ao usuário trocar a cor de destaque (brand) do sistema.
 * Presets baseados em OKLCH Hue para manter consistência premium.
 */

const PRESETS = [
  { name: "Laranja", hue: 45, color: "bg-[#f97316]" },
  { name: "Azul", hue: 250, color: "bg-[#3b82f6]" },
  { name: "Verde", hue: 145, color: "bg-[#22c55e]" },
  { name: "Roxo", hue: 300, color: "bg-[#a855f7]" },
  { name: "Rosa", hue: 340, color: "bg-[#ec4899]" },
  { name: "Amarelo", hue: 95, color: "bg-[#eab308]" },
];

export function ThemeColorPicker() {
  const { accentHue, setAccentHue } = useAppStore();

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
            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-white dark:border-zinc-900 shadow-sm"
          />
        </Button>
      } />
      <DropdownMenuContent
        align="end"
        className="p-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-700/50 rounded-[24px] shadow-2xl min-w-[180px] z-[100]"
      >
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((preset) => (
            <DropdownMenuItem
              key={preset.hue}
              onClick={() => setAccentHue(preset.hue)}
              className="relative p-0 h-10 w-full rounded-lg cursor-pointer focus:bg-transparent focus:outline-none group/item"
            >
              <div
                className={`w-full h-full rounded-lg ${preset.color} transition-all duration-300 group-hover/item:scale-110 group-hover/item:shadow-lg flex items-center justify-center`}
              >
                {accentHue === preset.hue && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    <Check className="w-4 h-4 text-white drop-shadow-md" />
                  </motion.div>
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
