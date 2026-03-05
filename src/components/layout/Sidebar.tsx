"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UploadCloud,
  FileSpreadsheet,
  ArrowRightLeft,
  Puzzle,
  ShieldCheck,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload Documents", icon: UploadCloud },
  { href: "/invoices", label: "Invoices", icon: FileSpreadsheet },
  { href: "/export", label: "Exports", icon: ArrowRightLeft },
  { href: "/integrations", label: "Integrations", icon: Puzzle },
  { href: "/audit-log", label: "Audit Log", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-64 border-r border-slate-200 bg-white px-4 py-4 lg:flex lg:flex-col">
      <div className="flex items-center gap-2 px-1 pb-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-white shadow-sm">
          AA
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            AIRAuto
          </span>
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            South Africa
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors",
                "hover:bg-slate-100 hover:text-slate-900",
                isActive &&
                  "bg-primary/5 text-primary border border-primary/10",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
        <div className="font-semibold text-slate-700">SA compliance</div>
        <div>VAT 15% · SARS · POPIA</div>
      </div>
    </aside>
  );
}

