"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface DottedGlowBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  opacity?: number;
  gap?: number;
  radius?: number;
  colorLightVar?: string;
  glowColorLightVar?: string;
  colorDarkVar?: string;
  glowColorDarkVar?: string;
  backgroundOpacity?: number;
  speedMin?: number;
  speedMax?: number;
  speedScale?: number;
}

export function DottedGlowBackground({
  children,
  className,
  opacity = 0.1,
  gap = 30,
  radius = 1.1,
  colorLightVar = "--color-neutral-400",
  glowColorLightVar = "--color-primary",
  colorDarkVar = "--color-neutral-600",
  glowColorDarkVar = "--color-primary",
  backgroundOpacity = 1,
  speedMin = 0.5,
  speedMax = 1.5,
  speedScale = 1,
}: DottedGlowBackgroundProps) {
  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      {/* Light mode dotted pattern */}
      <div
        className="absolute inset-0 w-full h-full dark:hidden"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(0, 0, 0, 0.15) ${radius}px, transparent ${radius}px)`,
          backgroundSize: `${gap}px ${gap}px`,
          backgroundColor: `hsl(var(--background) / ${backgroundOpacity})`,
        }}
      />
      
      {/* Dark mode dotted pattern */}
      <div
        className="absolute inset-0 w-full h-full hidden dark:block"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255, 255, 255, 0.2) ${radius}px, transparent ${radius}px)`,
          backgroundSize: `${gap}px ${gap}px`,
          backgroundColor: `hsl(var(--background) / ${backgroundOpacity})`,
        }}
      />

      {/* Content */}
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
}
