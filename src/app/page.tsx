"use client";

import Link from "next/link";
import { ArrowRight, FileSpreadsheet, UploadCloud } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

const stats = [
  {
    label: "Total invoices processed",
    value: "1,247",
    subtitle: "Since inception",
  },
  {
    label: "Invoices awaiting review",
    value: "7",
    subtitle: "Needs accountant action",
  },
  {
    label: "Total VAT detected (ZAR)",
    value: "R 482,315",
    subtitle: "Across all invoices",
  },
  {
    label: "Exports completed",
    value: "196",
    subtitle: "Pushed to ledgers",
  },
];

const recentActivity = [
  {
    id: "inv-001",
    date: "2026-03-05",
    supplier: "ABC Supplies (Pty) Ltd",
    invoiceNumber: "INV-2026-0042",
    vatNumber: "4123456789",
    amount: "R 4,536.75",
    status: "Validated",
    statusVariant: "success" as const,
  },
  {
    id: "inv-002",
    date: "2026-03-04",
    supplier: "Cape Office Solutions",
    invoiceNumber: "INV-2026-0189",
    vatNumber: "4567891234",
    amount: "R 12,890.00",
    status: "Needs review",
    statusVariant: "warning" as const,
  },
  {
    id: "inv-003",
    date: "2026-03-04",
    supplier: "Joburg Print & Copy CC",
    invoiceNumber: "REC-2026-0456",
    vatNumber: "4234567890",
    amount: "R 245.50",
    status: "Validated",
    statusVariant: "success" as const,
  },
  {
    id: "inv-004",
    date: "2026-03-03",
    supplier: "eThekwini IT Services (Pty) Ltd",
    invoiceNumber: "INV-2026-0788",
    vatNumber: "4345678901",
    amount: "R 38,750.00",
    status: "Exported",
    statusVariant: "info" as const,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            Daily overview of AIRAuto extraction, SARS validation, and export
            readiness.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href="/invoices">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              View invoices
            </Link>
          </Button>
          <Button asChild>
            <Link href="/upload">
              <UploadCloud className="mr-2 h-4 w-4" />
              Upload documents
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-slate-500">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl font-semibold text-slate-900">
                {card.value}
              </div>
              <p className="mt-1 text-xs text-slate-500">{card.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent activity</CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link href="/invoices">
                  View all
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>VAT #</TableHead>
                    <TableHead className="text-right">Amount (ZAR)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivity.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs text-slate-600">
                        {row.date}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-slate-900">
                        {row.supplier}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-700">
                        {row.invoiceNumber}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">
                        {row.vatNumber}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-slate-900">
                        {row.amount}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            row.statusVariant === "success"
                              ? "success"
                              : row.statusVariant === "warning"
                              ? "warning"
                              : "info"
                          }
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span>Rule-based extraction coverage</span>
              <span className="font-semibold text-slate-900">86%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Invoices using AI fallback</span>
              <span className="font-semibold text-slate-900">14%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>SARS validation pass rate</span>
              <span className="font-semibold text-slate-900">98.7%</span>
            </div>
            <div className="mt-3 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
              AIRAuto always runs deterministic rules first and only escalates to
              AI when confidence is low or formats are unusual — keeping your
              ledger predictable and explainable.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

