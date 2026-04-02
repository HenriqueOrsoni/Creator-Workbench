"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { motion, AnimatePresence } from "framer-motion";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700 focus:outline-none group overflow-hidden"
      aria-label="Alternar Modo Noturno"
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === "light" ? (
          <motion.div
            key="moon"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-orange-500"
          >
            <Moon size={20} />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-orange-500"
          >
            <Sun size={20} />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="absolute inset-0 bg-orange-500/10 scale-0 group-hover:scale-100 transition-transform rounded-xl -z-10" />
    </button>
  );
}
