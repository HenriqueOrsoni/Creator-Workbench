import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Creator Workbench | Gestão de Conteúdo Digital",
  description: "Sistema de gestão de operações para conteúdo educacional digital.",
};

import { ThemeProvider } from "../components/shared/ThemeProvider";
import { AuthGuard } from "../components/shared/AuthGuard";
import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${jakarta.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <ThemeProvider>
          <AuthGuard>
            {children}
          </AuthGuard>
          <Toaster richColors position="top-right" closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
