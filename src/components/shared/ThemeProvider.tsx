"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("studio-theme") as Theme;
    const initialTheme = savedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    }
    
    // Defer React state updates to avoid synchronous cascading render warnings
    setTimeout(() => {
      setTheme(initialTheme);
      setMounted(true);
    }, 0);
  }, []);



  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("studio-theme", newTheme);
    
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {mounted ? children : <div className="invisible">{children}</div>}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
