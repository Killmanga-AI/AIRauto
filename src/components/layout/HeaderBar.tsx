 "use client";

import { Bell, Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HeaderBar() {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur",
      )}
    >
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search invoices, suppliers, VAT numbers..."
              className="h-9 pl-9 text-xs"
            />
          </div>
        </div>
        <div className="flex items-center gap-4 pl-6">
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>
          <div className="h-6 w-px bg-slate-200" />
          <button className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[11px] uppercase tracking-wide text-slate-400">
                Organisation
              </span>
              <span>AIRAuto Demo Firm</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-white">
                MT
              </div>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
