"use client";

import { useEffect, useRef } from "react";

interface FormModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
  submitting?: boolean;
}

export function FormModal({
  title,
  open,
  onClose,
  onSubmit,
  children,
  submitting,
}: FormModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <dialog
        ref={ref}
        onClose={onClose}
        className="bg-card border border-border rounded-2xl p-0 w-full max-w-lg max-h-[90vh] overflow-y-auto text-foreground backdrop:bg-transparent"
        open
      >
        <form onSubmit={onSubmit}>
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          <div className="p-6 space-y-4">{children}</div>
          <div className="p-6 border-t border-border flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 rounded-lg font-medium transition-colors"
            >
              {submitting ? "Salvataggio..." : "Salva"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export const inputClass =
  "w-full bg-muted border border-input rounded-lg px-3 py-2 text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:border-primary";

export const selectClass =
  "w-full bg-muted border border-input rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary";
