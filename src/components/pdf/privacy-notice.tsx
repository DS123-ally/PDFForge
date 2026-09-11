import { ShieldCheck } from "lucide-react";

export function PrivacyNotice() {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 text-sm leading-6 text-zinc-700">
      <ShieldCheck
        aria-hidden="true"
        className="mt-0.5 size-5 shrink-0 text-emerald-700"
      />
      <p>
        <strong className="font-semibold text-zinc-950">
          Private by design.
        </strong>{" "}
        Your files stay on this device and are never uploaded.
      </p>
    </div>
  );
}
