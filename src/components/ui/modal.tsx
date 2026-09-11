"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

type ModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function Modal({ open, title, children, onClose }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      aria-labelledby="modal-title"
      className="m-auto w-[calc(100%_-_2rem)] max-w-lg rounded-2xl bg-white p-6 text-zinc-950 shadow-xl backdrop:bg-black/45"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      ref={dialogRef}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id="modal-title" className="text-xl font-bold">
          {title}
        </h2>
        <Button
          aria-label="Close dialog"
          className="size-11 p-0"
          onClick={onClose}
          variant="ghost"
        >
          <X aria-hidden="true" className="size-5" />
        </Button>
      </div>
      <div className="mt-4 text-sm leading-6 text-zinc-600">{children}</div>
    </dialog>
  );
}
