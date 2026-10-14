"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  value: number | string;
  label: string;
  icon: LucideIcon;
  iconHoverClass?: string;
}

export function StatsCard({
  value,
  label,
  icon: Icon,
}: StatsCardProps) {
  return (
    <div className="bg-card border border-border p-3.5 sm:p-4 rounded-xl flex items-center gap-3.5 shadow-xs transition-colors hover:border-primary/40 min-w-[160px] sm:min-w-[180px]">
      <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-xl sm:text-2xl font-bold font-heading leading-tight text-foreground tracking-tight">
          {value}
        </div>
        <div className="text-[11px] font-medium text-muted-foreground mt-0.5">
          {label}
        </div>
      </div>
    </div>
  );
}
