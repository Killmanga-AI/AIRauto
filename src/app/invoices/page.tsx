"use client";

import { useState } from "react";
import Link from "next/link";

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
    { className: string; label: string }
> = {
    validated: { className: "badge-green", label: "Validated" },
    needs_review: { className: "badge-gold", label: "Needs Review" },
    exported: { className: "badge-purple", label: "Exported" },
    queued: { className: "badge-blue", label: "Processing" },
    failed: { className: "badge-red", label: "Failed" },
};

const typeLabels: Record<string, string> = {
    full: "Full Tax Invoice",
    abridged: "Abridged",
    no_invoice_required: "≤ R50",
};

export default function InvoicesPage() {
    const [filter, setFilter] = useState<string>("all");
    const [search, setSearch] = useState("");

    const filtered = demoInvoices.filter((inv) => {
        if (filter !== "all" && inv.status !== filter) return false;
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

    return (
        <>
            <div className="page-header">
                <div className="flex items-center justify-between">
                    <div>
                        <h1>Invoices</h1>
                        <p>Manage extracted invoices and receipts</p>
                    </div>
                    <Link href="/upload" className="btn btn-primary">
                        📤 Upload New
                    </Link>
                </div>
            </div>

            <div className="page-body">
                {/* Filters */}
                <div
                    className="flex items-center gap-md mb-lg animate-fade-in"
                    style={{ flexWrap: "wrap" }}
                >
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search vendor or invoice number..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ maxWidth: 320 }}
                    />

                    <div className="flex gap-sm">
                        {[
                            { key: "all", label: "All" },
                            { key: "needs_review", label: "Needs Review" },
                            { key: "validated", label: "Validated" },
                            { key: "exported", label: "Exported" },
                            { key: "queued", label: "Processing" },
                        ].map((f) => (
                            <button
                                key={f.key}
                                className={`btn btn-sm ${filter === f.key ? "btn-primary" : "btn-secondary"
                                    }`}
                                onClick={() => setFilter(f.key)}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Invoice Table */}
                <div className="table-wrap animate-slide-up">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Vendor</th>
                                <th>VAT Number</th>
                                <th>Invoice #</th>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Subtotal</th>
                                <th>VAT (15%)</th>
                                <th>Total (ZAR)</th>
                                <th>Confidence</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((inv) => (
                                <tr key={inv.id}>
                                    <td>
                                        <span style={{ fontWeight: 500 }}>{inv.vendor}</span>
                                    </td>
                                    <td
                                        style={{
                                            fontFamily: "monospace",
                                            fontSize: 13,
                                            color: "var(--text-secondary)",
                                        }}
                                    >
                                        {inv.vendorVat}
                                    </td>
                                    <td style={{ fontFamily: "monospace", fontSize: 13 }}>
                                        {inv.number}
                                    </td>
                                    <td style={{ color: "var(--text-secondary)" }}>
                                        {inv.date}
                                    </td>
                                    <td>
                                        <span className="badge badge-blue">
                                            {typeLabels[inv.type]}
                                        </span>
                                    </td>
                                    <td style={{ fontFamily: "monospace" }}>
                                        {formatZAR(inv.subtotal)}
                                    </td>
                                    <td style={{ fontFamily: "monospace" }}>
                                        {formatZAR(inv.vat)}
                                    </td>
                                    <td style={{ fontWeight: 600, fontFamily: "monospace" }}>
                                        {formatZAR(inv.total)}
                                    </td>
                                    <td>
                                        {inv.confidence > 0 ? (
                                            <span
                                                className={`confidence ${inv.confidence >= 0.8
                                                        ? "high"
                                                        : inv.confidence >= 0.5
                                                            ? "medium"
                                                            : "low"
                                                    }`}
                                            >
                                                <span className="confidence-dot" />
                                                {Math.round(inv.confidence * 100)}%
                                            </span>
                                        ) : (
                                            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                                                —
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <span
                                            className={`badge ${statusConfig[inv.status]?.className}`}
                                        >
                                            {statusConfig[inv.status]?.label}
                                        </span>
                                    </td>
                                    <td>
                                        <Link
                                            href={`/invoices/${inv.id}`}
                                            className="btn btn-sm btn-secondary"
                                        >
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={11}
                                        style={{
                                            textAlign: "center",
                                            padding: "40px 0",
                                            color: "var(--text-muted)",
                                        }}
                                    >
                                        No invoices found matching your filters
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Summary bar */}
                <div
                    className="card mt-lg flex items-center justify-between"
                    style={{ padding: "12px 24px" }}
                >
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        Showing {filtered.length} of {demoInvoices.length} invoices
                    </span>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        Total VAT:{" "}
                        <strong style={{ color: "var(--accent-gold)" }}>
                            {formatZAR(
                                filtered.reduce((sum, inv) => sum + inv.vat, 0)
                            )}
                        </strong>
                    </span>
                </div>
            </div>
        </>
    );
}
