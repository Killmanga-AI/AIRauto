import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-slate-200 bg-slate-50 text-slate-800",
        info: "border-slate-200 bg-slate-50 text-slate-700",
        success: "border-green-100 bg-green-50 text-success",
        warning: "border-amber-100 bg-amber-50 text-warning",
        destructive: "border-red-100 bg-red-50 text-destructive",
        outline: "border-slate-300 text-slate-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

