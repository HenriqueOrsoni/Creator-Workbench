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
  iconHoverClass = "group-hover:bg-primary",
}: StatsCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-[20px_20px_60px_#efefef] dark:shadow-none border border-white dark:border-zinc-700 flex flex-col justify-between flex-1 min-w-[120px] aspect-square group hover:border-primary/20 transition-all">
      <div className={`w-10 h-10 bg-zinc-50 dark:bg-zinc-700 rounded-xl flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors ${iconHoverClass}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-2xl md:text-3xl font-black font-heading line-height-1 leading-none dark:text-zinc-100">
          {value}
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-1">
          {label}
        </div>
      </div>
    </div>
  );
}
