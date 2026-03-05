"use client";

import { useState } from "react";
import Link from "next/link";

const exportDestinations = [
    {
        id: "csv",
        name: "CSV Download",
        icon: "📊",
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
    const [exported, setExported] = useState(false);
    const [dateFormat, setDateFormat] = useState<string>("DD/MM/YYYY");

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
        setExported(true);

        // Simulate CSV download
        if (selectedDest === "csv") {
            const headers = [
                "Date",
                "Vendor",
                "VAT Number",
                "Invoice #",
                "Total (ZAR)",
            ];
            const rows = exportableInvoices
                .filter((i) => selectedInvoices.has(i.id))
                .map((i) => [
                    "05/03/2026",
                    i.vendor,
                    "4123456789",
                    i.number,
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
        }

        setTimeout(() => setExported(false), 3000);
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
        <>
            <div className="page-header">
                <h1>Export</h1>
                <p>Export validated invoices to your accounting software or CSV</p>
            </div>

            <div className="page-body">
                {/* Destination Selection */}
                <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                    1. Choose Destination
                </h2>

                <div className="export-grid animate-fade-in">
                    {exportDestinations.map((dest) => (
                        <div
                            key={dest.id}
                            className={`export-card ${selectedDest === dest.id ? "selected" : ""} ${!dest.available ? "disabled" : ""
                                }`}
                            onClick={() => dest.available && setSelectedDest(dest.id)}
                            style={{
                                opacity: dest.available ? 1 : 0.5,
                                cursor: dest.available ? "pointer" : "not-allowed",
                            }}
                        >
                            <div className="export-card-icon">{dest.icon}</div>
                            <h3>{dest.name}</h3>
                            <p>{dest.description}</p>
                            <span
                                className={`badge ${dest.available ? "badge-green" : "badge-blue"}`}
                                style={{ marginTop: 12 }}
                            >
                                {dest.badge}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Invoice Selection */}
                <h2
                    style={{
                        fontSize: 16,
                        fontWeight: 600,
                        marginTop: 32,
                        marginBottom: 16,
                    }}
                >
                    2. Select Invoices
                </h2>

                <div className="table-wrap animate-slide-up">
                    <table className="table">
                        <thead>
                            <tr>
                                <th style={{ width: 40 }}>
                                    <input
                                        type="checkbox"
                                        checked={
                                            selectedInvoices.size === exportableInvoices.length
                                        }
                                        onChange={toggleAll}
                                        style={{ cursor: "pointer" }}
                                    />
                                </th>
                                <th>Vendor</th>
                                <th>Invoice #</th>
                                <th>Total (ZAR)</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {exportableInvoices.map((inv) => (
                                <tr key={inv.id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedInvoices.has(inv.id)}
                                            onChange={() => toggleInvoice(inv.id)}
                                            style={{ cursor: "pointer" }}
                                        />
                                    </td>
                                    <td style={{ fontWeight: 500 }}>{inv.vendor}</td>
                                    <td style={{ fontFamily: "monospace", fontSize: 13 }}>
                                        {inv.number}
                                    </td>
                                    <td style={{ fontFamily: "monospace", fontWeight: 600 }}>
                                        {formatZAR(inv.total)}
                                    </td>
                                    <td>
                                        <span className="badge badge-green">Validated</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Export Options */}
                <h2
                    style={{
                        fontSize: 16,
                        fontWeight: 600,
                        marginTop: 32,
                        marginBottom: 16,
                    }}
                >
                    3. Export Settings
                </h2>

                <div
                    className="card animate-slide-up"
                    style={{ maxWidth: 480 }}
                >
                    <div className="form-group">
                        <label className="form-label">Date Format</label>
                        <select
                            className="form-input form-select"
                            value={dateFormat}
                            onChange={(e) => setDateFormat(e.target.value)}
                        >
                            <option value="DD/MM/YYYY">DD/MM/YYYY (SA Standard)</option>
                            <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Currency</label>
                        <input
                            type="text"
                            className="form-input"
                            value="ZAR (South African Rand)"
                            disabled
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">VAT Rate</label>
                        <input
                            type="text"
                            className="form-input"
                            value="15% (Standard Rate)"
                            disabled
                        />
                    </div>
                </div>

                {/* Export Summary & Button */}
                <div
                    className="card mt-lg flex items-center justify-between animate-slide-up"
                    style={{
                        padding: "16px 24px",
                        background:
                            selectedInvoices.size > 0
                                ? "var(--accent-blue-glow)"
                                : "var(--bg-card)",
                        borderColor:
                            selectedInvoices.size > 0
                                ? "var(--accent-blue)"
                                : "var(--bg-glass-border)",
                    }}
                >
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                            {selectedInvoices.size} invoice
                            {selectedInvoices.size !== 1 ? "s" : ""} selected
                        </div>
                        <div
                            style={{
                                fontSize: 13,
                                color: "var(--text-secondary)",
                                marginTop: 2,
                            }}
                        >
                            Total: {formatZAR(selectedTotal)} →{" "}
                            {
                                exportDestinations.find((d) => d.id === selectedDest)
                                    ?.name
                            }
                        </div>
                    </div>

                    <button
                        className="btn btn-primary btn-lg"
                        disabled={selectedInvoices.size === 0}
                        onClick={handleExport}
                        style={{
                            opacity: selectedInvoices.size === 0 ? 0.5 : 1,
                            cursor:
                                selectedInvoices.size === 0 ? "not-allowed" : "pointer",
                        }}
                    >
                        {exported ? "✅ Exported!" : "📦 Export Now"}
                    </button>
                </div>
            </div>
        </>
    );
}
