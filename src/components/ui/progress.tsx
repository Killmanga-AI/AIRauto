import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

export function Progress({ value = 0, className, ...props }: ProgressProps) {
  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-slate-100",
        className,
      )}
      {...props}
    >
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

