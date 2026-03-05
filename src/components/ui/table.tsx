import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn(
        "w-full min-w-full border-collapse text-left text-sm text-slate-700",
        className,
      )}
      {...props}
    />
  );
}

export function TableHeader(
  props: React.HTMLAttributes<HTMLTableSectionElement>,
) {
  return <thead className="bg-slate-50 text-xs uppercase" {...props} />;
}

export function TableBody(
  props: React.HTMLAttributes<HTMLTableSectionElement>,
) {
  return <tbody {...props} />;
}

export function TableRow(
  props: React.HTMLAttributes<HTMLTableRowElement>,
) {
  return (
    <tr
      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
      {...props}
    />
  );
}

export function TableHead(
  props: React.ThHTMLAttributes<HTMLTableCellElement>,
) {
  return (
    <th
      className="px-4 py-2 text-xs font-semibold tracking-wide text-slate-500"
      {...props}
    />
  );
}

export function TableCell(
  props: React.TdHTMLAttributes<HTMLTableCellElement>,
) {
  return <td className="px-4 py-2 align-middle" {...props} />;
}

