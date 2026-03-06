"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "info" | "error";

export interface ToastState {
  open: boolean;
  title: string;
  message?: string;
  variant?: ToastVariant;
}

export function Toast({
  state,
  onClose,
}: {
  state: ToastState;
  onClose: () => void;
}) {
  React.useEffect(() => {
    if (!state.open) return;
    const t = setTimeout(() => onClose(), 2800);
    return () => clearTimeout(t);
  }, [state.open, onClose]);

  if (!state.open) return null;

  const palette =
    state.variant === "success"
      ? "border-green-200 bg-green-50 text-green-900"
      : state.variant === "error"
      ? "border-red-200 bg-red-50 text-red-900"
      : "border-slate-200 bg-white text-slate-900";

  return (
    <div className="fixed right-6 top-6 z-50 w-[360px]">
      <div
        className={cn(
          "rounded-lg border p-4 shadow-card",
          palette,
        )}
        role="status"
        aria-live="polite"
      >
        <div className="text-sm font-semibold">{state.title}</div>
        {state.message ? (
          <div className="mt-1 text-xs opacity-80">{state.message}</div>
        ) : null}
      </div>
    </div>
  );
}

