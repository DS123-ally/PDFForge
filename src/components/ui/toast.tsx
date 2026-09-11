import { CheckCircle2, CircleAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type ToastProps = {
  message: string;
  tone?: "success" | "error";
  onDismiss?: () => void;
};

export function Toast({ message, tone = "success", onDismiss }: ToastProps) {
  const Icon = tone === "success" ? CheckCircle2 : CircleAlert;

  return (
    <div
      className="flex min-h-14 items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg"
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon
        aria-hidden="true"
        className={tone === "success" ? "text-emerald-600" : "text-red-600"}
      />
      <p className="flex-1 text-sm font-semibold">{message}</p>
      {onDismiss ? (
        <Button
          aria-label="Dismiss notification"
          className="size-11 p-0"
          onClick={onDismiss}
          variant="ghost"
        >
          <X aria-hidden="true" className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
