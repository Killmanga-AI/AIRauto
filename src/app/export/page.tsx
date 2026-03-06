"use client";

import { useState } from "react";
import { ArrowRightLeft, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Toast, type ToastState } from "@/components/ui/toast";

const exportDestinations = [
    {
        id: "csv",
        name: "CSV Download",
        icon: FileDown,
        description: "Download invoices as a CSV file with SA-standard columns",
        available: true,
        badge: "Ready",
    },
    {
        id: "sage",
        name: "Sage Business Cloud",
        icon: "🟢",
        description:
            "Push directly to Sage — South Africa's #1 accounting platform",
        available: false,
        badge: "Coming Soon",
    },
    {
        id: "xero",
        name: "Xero",
        icon: "🔵",
        description: "Export to Xero with automatic VAT and contact mapping",
        available: false,
        badge: "Coming Soon",
    },
    {
        id: "quickbooks",
        name: "QuickBooks Online",
        icon: "🟡",
        description: "Push invoice data to QuickBooks with ZAR currency support",
        available: false,
        badge: "Coming Soon",
    },
];

const exportableInvoices = [
    {
        id: "inv-001",
        vendor: "ABC Supplies (Pty) Ltd",
        number: "INV-2026-0042",
        total: 4536.75,
        status: "validated",
        selected: true,
    },
    {
        id: "inv-003",
        vendor: "Joburg Print & Copy CC",
        number: "REC-2026-0456",
        total: 245.5,
        status: "validated",
        selected: true,
    },
    {
        id: "inv-004",
        vendor: "eThekwini IT Services (Pty) Ltd",
        number: "INV-2026-0788",
        total: 38750.0,
        status: "validated",
        selected: false,
    },
    {
        id: "inv-006",
        vendor: "Pretoria Legal Consultants",
        number: "INV-2026-0567",
        total: 28750.0,
        status: "validated",
        selected: false,
    },
];

export default function ExportPage() {
    const [selectedDest, setSelectedDest] = useState<string>("csv");
    const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(
        new Set(
            exportableInvoices.filter((i) => i.selected).map((i) => i.id)
        )
    );
    const [dateFormat, setDateFormat] = useState<string>("DD/MM/YYYY");
    const [toast, setToast] = useState<ToastState>({
        open: false,
        title: "",
        message: "",
        variant: "info",
    });

    const toggleInvoice = (id: string) => {
        setSelectedInvoices((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedInvoices.size === exportableInvoices.length) {
            setSelectedInvoices(new Set());
        } else {
            setSelectedInvoices(
                new Set(exportableInvoices.map((i) => i.id))
            );
        }
    };

    const handleExport = () => {
        // Simulate CSV download
        if (selectedDest === "csv") {
            const headers = [
                "Date",
                "Vendor",
                "VAT Number",
                "Invoice #",
                "Subtotal",
                "VAT (15%)",
                "Total (ZAR)",
            ];
            const rows = exportableInvoices
                .filter((i) => selectedInvoices.has(i.id))
                .map((i) => [
                    "05/03/2026",
                    i.vendor,
                    "4123456789",
                    i.number,
                    (i.total / 1.15).toFixed(2),
                    (i.total - i.total / 1.15).toFixed(2),
                    i.total.toFixed(2),
                ]);
            const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
                "\n"
            );
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `airauto-export-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);

            setToast({
                open: true,
                title: "Export completed",
                message: `Downloaded ${selectedInvoices.size} invoice(s) as CSV.`,
                variant: "success",
            });
        }
    };

    const formatZAR = (n: number) =>
        `R ${n.toLocaleString("en-ZA", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;

    const selectedTotal = exportableInvoices
        .filter((i) => selectedInvoices.has(i.id))
        .reduce((sum, i) => sum + i.total, 0);

    return (
        <div className="space-y-6">
            <Toast state={toast} onClose={() => setToast((s) => ({ ...s, open: false }))} />

            <div>
                <h1 className="text-2xl font-semibold text-slate-900">Exports</h1>
                <p className="mt-1 text-sm text-slate-600">
                    Select validated invoices and export to CSV or your accounting platform.
                </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ArrowRightLeft className="h-4 w-4 text-slate-500" />
                            Invoice selection
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10">
                                            <input
                                                type="checkbox"
                                                checked={selectedInvoices.size === exportableInvoices.length}
                                                onChange={toggleAll}
                                            />
                                        </TableHead>
                                        <TableHead>Supplier</TableHead>
                                        <TableHead>Invoice #</TableHead>
                                        <TableHead className="text-right">Total (ZAR)</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {exportableInvoices.map((inv) => (
                                        <TableRow key={inv.id}>
                                            <TableCell>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedInvoices.has(inv.id)}
                                                    onChange={() => toggleInvoice(inv.id)}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium text-slate-900">
                                                {inv.vendor}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-slate-700">
                                                {inv.number}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs font-semibold text-slate-900">
                                                {formatZAR(inv.total)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="success">Validated</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Destination</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-2">
                            {exportDestinations.map((dest) => {
                                const Icon = dest.icon;
                                const isSelected = selectedDest === dest.id;
                                return (
                                    <button
                                        key={dest.id}
                                        onClick={() => dest.available && setSelectedDest(dest.id)}
                                        className={[
                                            "w-full rounded-lg border p-3 text-left transition-colors",
                                            dest.available ? "bg-white" : "bg-slate-50 opacity-70",
                                            isSelected ? "border-primary bg-primary/5" : "border-slate-200 hover:bg-slate-50",
                                        ].join(" ")}
                                        disabled={!dest.available}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
                                                    <Icon className="h-4 w-4 text-slate-700" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-900">
                                                        {dest.name}
                                                    </div>
                                                    <div className="text-xs text-slate-600">
                                                        {dest.description}
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant={dest.available ? "success" : "info"}>
                                                {dest.badge}
                                            </Badge>
                                        </div>
                                    </button>
                                );
                            })}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Export settings</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                            <div className="grid gap-1">
                                <label className="text-xs font-medium text-slate-600">Date format</label>
                                <select
                                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                    value={dateFormat}
                                    onChange={(e) => setDateFormat(e.target.value)}
                                >
                                    <option value="DD/MM/YYYY">DD/MM/YYYY (SA standard)</option>
                                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                                </select>
                            </div>

                            <div className="grid gap-1">
                                <label className="text-xs font-medium text-slate-600">Currency</label>
                                <Input value="ZAR (South African Rand)" disabled />
                            </div>

                            <div className="grid gap-1">
                                <label className="text-xs font-medium text-slate-600">VAT rate</label>
                                <Input value="15% (standard)" disabled />
                            </div>

                            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                                CSV columns: Date · Vendor · VAT Number · Invoice Number · Subtotal · VAT (15%) · Total (ZAR)
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="flex items-center justify-between p-4">
                            <div>
                                <div className="text-sm font-semibold text-slate-900">
                                    {selectedInvoices.size} selected
                                </div>
                                <div className="text-xs text-slate-600">
                                    Total: {formatZAR(selectedTotal)}
                                </div>
                            </div>
                            <Button disabled={selectedInvoices.size === 0} onClick={handleExport}>
                                Export selected
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
