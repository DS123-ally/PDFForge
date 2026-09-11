import { Button } from "@/components/ui/button";

type MobileActionBarProps = {
  label: string;
};

export function MobileActionBar({ label }: MobileActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 p-3 backdrop-blur md:hidden">
      <Button className="w-full" disabled type="button">
        {label}
      </Button>
    </div>
  );
}
