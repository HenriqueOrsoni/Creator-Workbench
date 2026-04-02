"use client";

import React from "react";
import { useTheme } from "@/components/shared/ThemeProvider";
import { Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Componente: ThemeToggle
 * Alterna entre modo claro e escuro usando o contexto customizado.
 * Estética Unificada: Creative (The Studio).
 */

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <button
      onClick={toggleTheme}
      className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 group active:scale-90"
      aria-label="Toggle Theme"
    >
      <AnimatePresence mode="wait">
        {theme === "dark" ? (
          <motion.div
            key="moon"
            initial={{ y: 20, opacity: 0, rotate: 45 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -20, opacity: 0, rotate: -45 }}
            transition={{ duration: 0.2 }}
          >
            <Moon className="w-5 h-5 text-zinc-400 group-hover:text-primary transition-colors" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ y: 20, opacity: 0, rotate: -45 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -20, opacity: 0, rotate: 45 }}
            transition={{ duration: 0.2 }}
          >
            <Sun className="w-5 h-5 text-zinc-500 group-hover:text-primary transition-colors" />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="absolute inset-0 bg-primary/10 scale-0 group-hover:scale-100 transition-transform rounded-xl -z-10" />
    </button>
  );
}
