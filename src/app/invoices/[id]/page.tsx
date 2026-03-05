"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

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
        <>
            <div className="page-header">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-md">
                            <Link
                                href="/invoices"
                                className="btn btn-sm btn-secondary"
                            >
                                ← Back
                            </Link>
                            <div>
                                <h1>Invoice Detail</h1>
                                <p>
                                    {demoInvoice.originalFileName} · Uploaded{" "}
                                    {demoInvoice.uploadedAt}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-sm">
                        <button
                            className="btn btn-primary"
                            onClick={handleSave}
                        >
                            {saved ? "✓ Saved" : "💾 Save Changes"}
                        </button>
                        <Link href="/export" className="btn btn-gold">
                            📦 Export
                        </Link>
                    </div>
                </div>
            </div>

            <div className="page-body">
                {/* Processing Info Bar */}
                <div
                    className="card flex items-center gap-lg mb-lg animate-fade-in"
                    style={{
                        padding: "12px 20px",
                        background: "var(--bg-secondary)",
                    }}
                >
                    <span className="badge badge-blue">
                        🤖 {demoInvoice.aiModel}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        Processed in {demoInvoice.processingTime}
                    </span>
                    <span className="badge badge-green">Abridged Invoice</span>
                    <span
                        style={{
                            marginLeft: "auto",
                            fontSize: 13,
                            color: "var(--text-secondary)",
                        }}
                    >
                        ID: {params.id}
                    </span>
                </div>

                <div className="invoice-detail-layout">
                    {/* Left: Document Preview */}
                    <div className="document-preview animate-fade-in">
                        <div className="document-preview-text">
                            {demoInvoice.ocrText}
                        </div>
                    </div>

                    {/* Right: Extracted Fields + Validation */}
                    <div className="animate-slide-up">
                        <h2
                            style={{
                                fontSize: 16,
                                fontWeight: 600,
                                marginBottom: 16,
                            }}
                        >
                            Extracted Fields
                        </h2>

                        {Object.entries(fieldLabels).map(([key, label]) => (
                            <div className="form-group" key={key}>
                                <label className="form-label">
                                    <span>{label}</span>
                                    {demoInvoice.fields[key] && (
                                        <span
                                            className={`confidence ${demoInvoice.fields[key].level}`}
                                        >
                                            <span className="confidence-dot" />
                                            {Math.round(
                                                demoInvoice.fields[key].confidence * 100
                                            )}
                                            %
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={getFieldValue(key)}
                                    onChange={(e) =>
                                        handleFieldChange(key, e.target.value)
                                    }
                                />
                            </div>
                        ))}

                        {/* Line Items */}
                        <h2
                            style={{
                                fontSize: 16,
                                fontWeight: 600,
                                marginTop: 24,
                                marginBottom: 16,
                            }}
                        >
                            Line Items
                        </h2>

                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Description</th>
                                        <th>Qty</th>
                                        <th>Unit Price</th>
                                        <th>VAT</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {demoInvoice.lineItems.map((li, idx) => (
                                        <tr key={idx}>
                                            <td>{li.description}</td>
                                            <td>{li.quantity}</td>
                                            <td style={{ fontFamily: "monospace" }}>
                                                {formatZAR(li.unitPrice)}
                                            </td>
                                            <td style={{ fontFamily: "monospace" }}>
                                                {formatZAR(li.vatAmount)}
                                            </td>
                                            <td
                                                style={{
                                                    fontFamily: "monospace",
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {formatZAR(li.lineTotal)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* SARS Validation Panel */}
                        <h2
                            style={{
                                fontSize: 16,
                                fontWeight: 600,
                                marginTop: 24,
                                marginBottom: 8,
                            }}
                        >
                            🇿🇦 SARS Validation
                        </h2>
                        <p
                            style={{
                                fontSize: 13,
                                color: "var(--text-secondary)",
                                marginBottom: 16,
                            }}
                        >
                            {passCount} passed · {failCount} failed ·{" "}
                            {demoInvoice.validationResults.length} total checks
                        </p>

                        <div className="validation-panel">
                            {demoInvoice.validationResults.map((v, idx) => (
                                <div className="validation-item" key={idx}>
                                    <div
                                        className={`validation-icon ${v.valid
                                                ? "pass"
                                                : v.severity === "warning"
                                                    ? "warn"
                                                    : "fail"
                                            }`}
                                    >
                                        {v.valid ? "✓" : v.severity === "warning" ? "!" : "✕"}
                                    </div>
                                    <div className="validation-text">
                                        <span className="validation-field">
                                            {fieldLabels[v.field] || v.field}
                                        </span>
                                        <br />
                                        <span className="validation-msg">{v.message}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
