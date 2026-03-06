"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    CheckCircle2,
    AlertTriangle,
    XCircle,
    FileText,
    Save,
} from "lucide-react";
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

// Demo invoice detail
const demoInvoice = {
    id: "inv-001",
    originalFileName: "abc-supplies-invoice-042.pdf",
    uploadedAt: "05/03/2026 09:15",
    status: "needs_review" as const,
    aiModel: "gpt-4o-mini",
    processingTime: "2.8s",
    ocrText: `TAX INVOICE

ABC Supplies (Pty) Ltd
123 Main Street, Sandton, Johannesburg, 2196
VAT Registration: 4123456789
Tel: 011 555 1234

Bill To:
XYZ Trading CC
456 Oak Avenue, Pretoria, 0001
VAT: 4987654321

Invoice Number: INV-2026-0042
Date: 05/03/2026

Description                    Qty    Unit Price    Amount
-------------------------------------------------------
A4 Copy Paper (Box)             10      R 85.00    R 850.00
Printer Ink Cartridges           5     R 345.00  R 1,725.00
Lever Arch Files                20      R 42.50    R 850.00
Whiteboard Markers (Pack)        8      R 65.00    R 520.00

                              Subtotal:          R 3,945.00
                              VAT (15%):           R 591.75
                              TOTAL:             R 4,536.75

Payment Terms: 30 days from date of invoice
B-BBEE Level: 2`,
    fields: {
        invoiceLabel: { value: "Tax Invoice", confidence: 0.98, level: "high" },
        vendorName: {
            value: "ABC Supplies (Pty) Ltd",
            confidence: 0.95,
            level: "high",
        },
        vendorAddress: {
            value: "123 Main Street, Sandton, Johannesburg, 2196",
            confidence: 0.92,
            level: "high",
        },
        vendorVatNumber: { value: "4123456789", confidence: 0.97, level: "high" },
        customerName: { value: "XYZ Trading CC", confidence: 0.94, level: "high" },
        customerAddress: {
            value: "456 Oak Avenue, Pretoria, 0001",
            confidence: 0.9,
            level: "high",
        },
        customerVatNumber: { value: "4987654321", confidence: 0.93, level: "high" },
        invoiceNumber: { value: "INV-2026-0042", confidence: 0.99, level: "high" },
        invoiceDate: { value: "05/03/2026", confidence: 0.96, level: "high" },
        subtotal: { value: "3945.00", confidence: 0.97, level: "high" },
        vatRate: { value: "15", confidence: 1.0, level: "high" },
        vatAmount: { value: "591.75", confidence: 0.97, level: "high" },
        totalAmount: { value: "4536.75", confidence: 0.98, level: "high" },
        bbbeeLevel: { value: "2", confidence: 0.85, level: "high" },
        paymentTerms: {
            value: "30 days from date of invoice",
            confidence: 0.9,
            level: "high",
        },
    } as Record<
        string,
        { value: string; confidence: number; level: string }
    >,
    lineItems: [
        {
            description: "A4 Copy Paper (Box)",
            quantity: 10,
            unitPrice: 85.0,
            vatAmount: 127.5,
            lineTotal: 977.5,
        },
        {
            description: "Printer Ink Cartridges",
            quantity: 5,
            unitPrice: 345.0,
            vatAmount: 258.75,
            lineTotal: 1983.75,
        },
        {
            description: "Lever Arch Files",
            quantity: 20,
            unitPrice: 42.5,
            vatAmount: 127.5,
            lineTotal: 977.5,
        },
        {
            description: "Whiteboard Markers (Pack)",
            quantity: 8,
            unitPrice: 65.0,
            vatAmount: 78.0,
            lineTotal: 598.0,
        },
    ],
    validationResults: [
        {
            field: "invoiceLabel",
            valid: true,
            message: 'Invoice label "Tax Invoice" detected',
            severity: "info",
        },
        {
            field: "vendorVatNumber",
            valid: true,
            message: "Valid SA VAT number: 4123456789",
            severity: "info",
        },
        {
            field: "vendorName",
            valid: true,
            message: "Supplier name present",
            severity: "info",
        },
        {
            field: "vendorAddress",
            valid: true,
            message: "Supplier address present",
            severity: "info",
        },
        {
            field: "invoiceNumber",
            valid: true,
            message: "Sequential invoice number present",
            severity: "info",
        },
        {
            field: "invoiceDate",
            valid: true,
            message: "Invoice date present",
            severity: "info",
        },
        {
            field: "vatCalculation",
            valid: true,
            message: "VAT calculation verified at 15%",
            severity: "info",
        },
        {
            field: "invoiceType",
            valid: true,
            message: "Classified as Abridged Tax Invoice (R50 – R5,000)",
            severity: "info",
        },
        {
            field: "customerVatNumber",
            valid: true,
            message:
                "Customer VAT number not required for Abridged invoice but present",
            severity: "info",
        },
    ],
};

const fieldLabels: Record<string, string> = {
    invoiceLabel: "Invoice Label",
    vendorName: "Supplier Name",
    vendorAddress: "Supplier Address",
    vendorVatNumber: "Supplier VAT Number",
    customerName: "Customer Name",
    customerAddress: "Customer Address",
    customerVatNumber: "Customer VAT Number",
    invoiceNumber: "Invoice Number",
    invoiceDate: "Invoice Date",
    subtotal: "Subtotal (ZAR)",
    vatRate: "VAT Rate (%)",
    vatAmount: "VAT Amount (ZAR)",
    totalAmount: "Total Amount (ZAR)",
    bbbeeLevel: "B-BBEE Level",
    paymentTerms: "Payment Terms",
};

export default function InvoiceDetailPage() {
    const params = useParams();
    const [editedFields, setEditedFields] = useState<Record<string, string>>({});
    const [saved, setSaved] = useState(false);

    const getFieldValue = (key: string) => {
        return editedFields[key] ?? demoInvoice.fields[key]?.value ?? "";
    };

    const handleFieldChange = (key: string, value: string) => {
        setEditedFields((prev) => ({ ...prev, [key]: value }));
        setSaved(false);
    };

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const formatZAR = (n: number) =>
        `R ${n.toLocaleString("en-ZA", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;

    const passCount = demoInvoice.validationResults.filter((v) => v.valid).length;
    const failCount = demoInvoice.validationResults.filter(
        (v) => !v.valid
    ).length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                    <div className="flex items-center gap-2">
                        <Button asChild variant="ghost" size="sm">
                            <Link href="/invoices">Back</Link>
                        </Button>
                        <h1 className="text-2xl font-semibold text-slate-900">
                            Invoice detail
                        </h1>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                        {demoInvoice.originalFileName} · Uploaded {demoInvoice.uploadedAt}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleSave}>
                        <Save className="mr-2 h-4 w-4" />
                        {saved ? "Saved" : "Save changes"}
                    </Button>
                    <Button asChild variant="secondary">
                        <Link href="/export">Export</Link>
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="flex flex-wrap items-center gap-2 p-4 text-xs text-slate-600">
                    <Badge variant="info">Model: {demoInvoice.aiModel}</Badge>
                    <Badge variant="info">Processing: {demoInvoice.processingTime}</Badge>
                    <Badge variant="warning">Status: needs review</Badge>
                    <span className="ml-auto font-mono text-xs text-slate-400">
                        ID: {params.id}
                    </span>
                </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-[1fr,1fr]">
                <Card className="lg:sticky lg:top-24 lg:h-[calc(100vh-140px)]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-500" />
                            Document preview
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <pre className="max-h-[70vh] overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-700">
                            {demoInvoice.ocrText}
                        </pre>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Extracted data</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3 pt-0">
                            {Object.entries(fieldLabels).map(([key, label]) => (
                                <div key={key} className="grid gap-1">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-medium text-slate-600">
                                            {label}
                                        </label>
                                        {demoInvoice.fields[key] ? (
                                            <span className="text-xs text-slate-500">
                                                {Math.round(demoInvoice.fields[key].confidence * 100)}%
                                            </span>
                                        ) : null}
                                    </div>
                                    <Input
                                        value={getFieldValue(key)}
                                        onChange={(e) => handleFieldChange(key, e.target.value)}
                                    />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Line items</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Description</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                            <TableHead className="text-right">Unit price</TableHead>
                                            <TableHead className="text-right">VAT</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {demoInvoice.lineItems.map((li, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="text-sm font-medium text-slate-900">
                                                    {li.description}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs">
                                                    {li.quantity}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs">
                                                    {formatZAR(li.unitPrice)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs">
                                                    {formatZAR(li.vatAmount)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs font-semibold text-slate-900">
                                                    {formatZAR(li.lineTotal)}
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
                            <CardTitle>🇿🇦 SARS validation</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="mb-3 text-xs text-slate-600">
                                {passCount} passed · {failCount} failed · {demoInvoice.validationResults.length} total checks
                            </div>
                            <div className="space-y-2">
                                {demoInvoice.validationResults.map((v, idx) => {
                                    const Icon = v.valid
                                        ? CheckCircle2
                                        : v.severity === "warning"
                                            ? AlertTriangle
                                            : XCircle;
                                    const variant =
                                        v.valid ? "success" : v.severity === "warning" ? "warning" : "destructive";
                                    return (
                                        <div
                                            key={idx}
                                            className="flex items-start justify-between gap-3 rounded-md border border-slate-200 bg-white p-3"
                                        >
                                            <div className="flex items-start gap-2">
                                                <Icon className="mt-0.5 h-4 w-4 text-slate-500" />
                                                <div>
                                                    <div className="text-sm font-medium text-slate-900">
                                                        {fieldLabels[v.field] || v.field}
                                                    </div>
                                                    <div className="mt-0.5 text-xs text-slate-600">
                                                        {v.message}
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant={variant}>{v.severity}</Badge>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
