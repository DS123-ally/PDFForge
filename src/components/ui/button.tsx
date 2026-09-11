import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export function buttonStyles(variant: ButtonVariant = "primary") {
  return cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600",
    "disabled:cursor-not-allowed disabled:opacity-55",
    variant === "primary" && "bg-red-600 text-white hover:bg-red-700",
    variant === "secondary" &&
      "border border-zinc-300 bg-white text-zinc-950 hover:bg-zinc-50",
    variant === "ghost" && "text-zinc-700 hover:bg-zinc-100",
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ className, variant, ...props }: ButtonProps) {
  return <button className={cn(buttonStyles(variant), className)} {...props} />;
}
