"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// Demo invoices for the list view
const demoInvoices = [
    {
        id: "inv-001",
        vendor: "ABC Supplies (Pty) Ltd",
        vendorVat: "4123456789",
        number: "INV-2026-0042",
        date: "05/03/2026",
        subtotal: 3945.0,
        vat: 591.75,
        total: 4536.75,
        status: "validated",
        type: "abridged" as const,
        confidence: 0.95,
    },
    {
        id: "inv-002",
        vendor: "Cape Office Solutions",
        vendorVat: "4567891234",
        number: "INV-2026-0189",
        date: "04/03/2026",
        subtotal: 11208.7,
        vat: 1681.3,
        total: 12890.0,
        status: "needs_review",
        type: "full" as const,
        confidence: 0.62,
    },
    {
        id: "inv-003",
        vendor: "Joburg Print & Copy CC",
        vendorVat: "4234567890",
        number: "REC-2026-0456",
        date: "04/03/2026",
        subtotal: 213.48,
        vat: 32.02,
        total: 245.5,
        status: "validated",
        type: "abridged" as const,
        confidence: 0.91,
    },
    {
        id: "inv-004",
        vendor: "eThekwini IT Services (Pty) Ltd",
        vendorVat: "4345678901",
        number: "INV-2026-0788",
        date: "03/03/2026",
        subtotal: 33695.65,
        vat: 5054.35,
        total: 38750.0,
        status: "exported",
        type: "full" as const,
        confidence: 0.97,
    },
    {
        id: "inv-005",
        vendor: "Garden Route Catering",
        vendorVat: "4456789012",
        number: "INV-2026-0234",
        date: "03/03/2026",
        subtotal: 1373.91,
        vat: 206.09,
        total: 1580.0,
        status: "queued",
        type: "abridged" as const,
        confidence: 0.0,
    },
    {
        id: "inv-006",
        vendor: "Pretoria Legal Consultants",
        vendorVat: "4678901234",
        number: "INV-2026-0567",
        date: "02/03/2026",
        subtotal: 25000.0,
        vat: 3750.0,
        total: 28750.0,
        status: "validated",
        type: "full" as const,
        confidence: 0.93,
    },
    {
        id: "inv-007",
        vendor: "Durban Fresh Market",
        vendorVat: "4789012345",
        number: "REC-2026-0890",
        date: "01/03/2026",
        subtotal: 35.0,
        vat: 0,
        total: 35.0,
        status: "validated",
        type: "no_invoice_required" as const,
        confidence: 0.88,
    },
];

const statusConfig: Record<
    string,
    { label: string; variant: "info" | "warning" | "success" | "destructive" }
> = {
    validated: { label: "Validated", variant: "success" },
    needs_review: { label: "Needs review", variant: "warning" },
    exported: { label: "Exported", variant: "info" },
    queued: { label: "Processing", variant: "info" },
    failed: { label: "Failed", variant: "destructive" },
};

const typeLabels: Record<string, string> = {
    full: "Full Tax Invoice",
    abridged: "Abridged",
    no_invoice_required: "≤ R50",
};

export default function InvoicesPage() {
    const [filter, setFilter] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [supplierFilter, setSupplierFilter] = useState<string>("all");

    const filtered = demoInvoices.filter((inv) => {
        if (filter !== "all" && inv.status !== filter) return false;
        if (supplierFilter !== "all" && inv.vendor !== supplierFilter) return false;
        if (
            search &&
            !inv.vendor.toLowerCase().includes(search.toLowerCase()) &&
            !inv.number.toLowerCase().includes(search.toLowerCase())
        )
            return false;
        return true;
    });

    const formatZAR = (n: number) =>
        `R ${n.toLocaleString("en-ZA", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;

    const suppliers = Array.from(new Set(demoInvoices.map((i) => i.vendor)));

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Invoices</h1>
                    <p className="mt-1 text-sm text-slate-600">
                        Review extracted invoices, validate SARS compliance, and prepare exports.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/upload">Upload documents</Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-slate-500" />
                        Filters
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                    <div className="relative md:col-span-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search supplier or invoice number..."
                            className="pl-9"
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            value={supplierFilter}
                            onChange={(e) => setSupplierFilter(e.target.value)}
                        >
                            <option value="all">All suppliers</option>
                            {suppliers.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-3 flex flex-wrap gap-2">
                        {[
                            { key: "all", label: "All" },
                            { key: "needs_review", label: "Needs review" },
                            { key: "validated", label: "Validated" },
                            { key: "exported", label: "Exported" },
                            { key: "queued", label: "Processing" },
                        ].map((f) => (
                            <Button
                                key={f.key}
                                variant={filter === f.key ? "default" : "secondary"}
                                size="sm"
                                onClick={() => setFilter(f.key)}
                            >
                                {f.label}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Invoice list</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Supplier</TableHead>
                                    <TableHead>VAT number</TableHead>
                                    <TableHead>Invoice #</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Invoice type</TableHead>
                                    <TableHead className="text-right">Total (ZAR)</TableHead>
                                    <TableHead>Confidence</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((inv) => (
                                    <TableRow key={inv.id}>
                                        <TableCell className="font-medium text-slate-900">
                                            {inv.vendor}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-slate-600">
                                            {inv.vendorVat}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-slate-700">
                                            {inv.number}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-600">
                                            {inv.date}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{typeLabels[inv.type]}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs font-semibold text-slate-900">
                                            {formatZAR(inv.total)}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-700">
                                            {inv.confidence > 0 ? `${Math.round(inv.confidence * 100)}%` : "—"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={statusConfig[inv.status]?.variant}
                                            >
                                                {statusConfig[inv.status]?.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild variant="ghost" size="sm">
                                                <Link href={`/invoices/${inv.id}`}>Open</Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="py-10 text-center text-sm text-slate-500">
                                            No invoices found for the selected filters.
                                        </TableCell>
                                    </TableRow>
                                ) : null}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
                        <span>
                            Showing <span className="font-semibold text-slate-900">{filtered.length}</span> of{" "}
                            <span className="font-semibold text-slate-900">{demoInvoices.length}</span>
                        </span>
                        <span>
                            Total VAT:{" "}
                            <span className="font-semibold text-slate-900">
                                {formatZAR(filtered.reduce((sum, inv) => sum + inv.vat, 0))}
                            </span>
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
