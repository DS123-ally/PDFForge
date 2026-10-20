import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant =
  "primary" | "secondary" | "ghost" | "outline" | "danger";
export type ButtonSize = "sm" | "default" | "lg";

export function buttonStyles(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "default",
) {
  return cn(
    "inline-flex items-center justify-center gap-2 font-medium tracking-tight whitespace-nowrap transition-all duration-150 select-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    size === "sm" && "h-8 px-3 text-xs rounded-full",
    size === "default" && "min-h-10 px-4 py-2 text-sm rounded-full",
    size === "lg" && "min-h-12 px-6 py-3 text-base rounded-full shadow-sm",
    variant === "primary" &&
      "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.98]",
    variant === "secondary" &&
      "border border-border bg-white text-zinc-900 shadow-2xs hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-950 active:scale-[0.98]",
    variant === "outline" &&
      "border border-border bg-transparent text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 hover:border-zinc-300",
    variant === "ghost" &&
      "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950",
    variant === "danger" &&
      "bg-red-600 text-white hover:bg-red-700 shadow-xs active:scale-[0.98]",
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  className,
  size = "default",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button className={cn(buttonStyles(variant, size), className)} {...props} />
  );
}
