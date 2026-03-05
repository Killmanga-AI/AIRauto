"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";

interface FileEntry {
    file: File;
    id: string;
    progress: number;
    status: "pending" | "uploading" | "processing" | "done" | "error";
    error?: string;
}

export default function UploadPage() {
    const [files, setFiles] = useState<FileEntry[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const addFiles = useCallback((newFiles: FileList | null) => {
        if (!newFiles) return;
        const validTypes = [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/jpg",
        ];
        const entries: FileEntry[] = [];

        Array.from(newFiles).forEach((file) => {
            if (!validTypes.includes(file.type)) return;
            entries.push({
                file,
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                progress: 0,
                status: "pending",
            });
        });

        setFiles((prev) => [...prev, ...entries]);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragOver(false);
            addFiles(e.dataTransfer.files);
        },
        [addFiles]
    );

    const simulateUpload = useCallback(async () => {
        setFiles((prev) =>
            prev.map((f) =>
                f.status === "pending" ? { ...f, status: "uploading" as const } : f
            )
        );

        // Simulate progress for each file
        for (let i = 0; i < files.length; i++) {
            const fileId = files[i].id;
            if (files[i].status !== "pending" && files[i].status !== "uploading")
                continue;

            for (let p = 0; p <= 100; p += 20) {
                await new Promise((r) => setTimeout(r, 200));
                setFiles((prev) =>
                    prev.map((f) =>
                        f.id === fileId
                            ? {
                                ...f,
                                progress: p,
                                status: p === 100 ? ("processing" as const) : ("uploading" as const),
                            }
                            : f
                    )
                );
            }

            // Simulate AI processing
            await new Promise((r) => setTimeout(r, 1500));
            setFiles((prev) =>
                prev.map((f) =>
                    f.id === fileId ? { ...f, status: "done" as const, progress: 100 } : f
                )
            );
        }
    }, [files]);

    const removeFile = (id: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== id));
    };

    const getFileIcon = (type: string) => {
        if (type === "application/pdf") return "📕";
        return "🖼️";
    };

    const getStatusText = (status: FileEntry["status"]) => {
        switch (status) {
            case "pending":
                return "Ready to upload";
            case "uploading":
                return "Uploading...";
            case "processing":
                return "🤖 AI extracting fields...";
            case "done":
                return "✅ Extraction complete";
            case "error":
                return "❌ Failed";
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const pendingCount = files.filter(
        (f) => f.status === "pending" || f.status === "uploading"
    ).length;
    const doneCount = files.filter((f) => f.status === "done").length;

    return (
        <>
            <div className="page-header">
                <h1>Upload Invoices & Receipts</h1>
                <p>
                    Upload South African tax invoices or receipts for AI-powered
                    extraction
                </p>
            </div>

            <div className="page-body">
                {/* Upload Zone */}
                <div
                    className={`upload-zone animate-fade-in ${dragOver ? "drag-over" : ""}`}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                >
                    <div className="upload-zone-icon">📤</div>
                    <h3>Drop invoices or receipts here</h3>
                    <p>or click to browse files (batch upload supported)</p>

                    <div className="upload-formats">
                        <span className="upload-format-tag">PDF</span>
                        <span className="upload-format-tag">JPG</span>
                        <span className="upload-format-tag">PNG</span>
                    </div>

                    <input
                        ref={inputRef}
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png"
                        style={{ display: "none" }}
                        onChange={(e) => addFiles(e.target.files)}
                    />
                </div>

                {/* File List */}
                {files.length > 0 && (
                    <div className="animate-slide-up">
                        <div
                            className="flex items-center justify-between mt-lg mb-md"
                        >
                            <h2 style={{ fontSize: 16, fontWeight: 600 }}>
                                {files.length} file{files.length !== 1 ? "s" : ""} selected
                                {doneCount > 0 && (
                                    <span
                                        style={{
                                            color: "var(--accent-green)",
                                            fontWeight: 400,
                                            fontSize: 14,
                                            marginLeft: 8,
                                        }}
                                    >
                                        · {doneCount} processed
                                    </span>
                                )}
                            </h2>
                            <div className="flex gap-sm">
                                {pendingCount > 0 && (
                                    <button
                                        className="btn btn-primary"
                                        onClick={simulateUpload}
                                    >
                                        🚀 Process {pendingCount} File
                                        {pendingCount !== 1 ? "s" : ""}
                                    </button>
                                )}
                                {doneCount > 0 && (
                                    <Link
                                        href="/invoices"
                                        className="btn btn-secondary"
                                    >
                                        📄 View Extracted Data
                                    </Link>
                                )}
                            </div>
                        </div>

                        <div className="file-list">
                            {files.map((entry) => (
                                <div key={entry.id} className="file-item">
                                    <div
                                        className={`file-icon ${entry.file.type === "application/pdf" ? "pdf" : "img"
                                            }`}
                                    >
                                        {getFileIcon(entry.file.type)}
                                    </div>

                                    <div className="file-info">
                                        <div className="file-name">{entry.file.name}</div>
                                        <div className="file-meta">
                                            {formatBytes(entry.file.size)} ·{" "}
                                            {getStatusText(entry.status)}
                                        </div>
                                        {(entry.status === "uploading" ||
                                            entry.status === "processing") && (
                                                <div className="file-progress">
                                                    <div
                                                        className="file-progress-bar"
                                                        style={{
                                                            width:
                                                                entry.status === "processing"
                                                                    ? "100%"
                                                                    : `${entry.progress}%`,
                                                        }}
                                                    />
                                                </div>
                                            )}
                                    </div>

                                    <div className="file-actions">
                                        {entry.status === "done" && (
                                            <span className="badge badge-green">✓ Done</span>
                                        )}
                                        {entry.status === "processing" && (
                                            <div className="spinner" />
                                        )}
                                        {entry.status === "pending" && (
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                onClick={() => removeFile(entry.id)}
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* How It Works */}
                <div className="grid-3col mt-lg animate-slide-up">
                    <div className="card" style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>📷</div>
                        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
                            1. Upload Document
                        </h3>
                        <p
                            style={{
                                fontSize: 13,
                                color: "var(--text-secondary)",
                                lineHeight: 1.5,
                            }}
                        >
                            Upload a South African tax invoice or receipt as PDF, JPG, or PNG
                        </p>
                    </div>
                    <div className="card" style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
                        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
                            2. AI Extraction
                        </h3>
                        <p
                            style={{
                                fontSize: 13,
                                color: "var(--text-secondary)",
                                lineHeight: 1.5,
                            }}
                        >
                            Native OCR + GPT extracts vendor, VAT number, amounts, and line
                            items
                        </p>
                    </div>
                    <div className="card" style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
                        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
                            3. SARS Validation
                        </h3>
                        <p
                            style={{
                                fontSize: 13,
                                color: "var(--text-secondary)",
                                lineHeight: 1.5,
                            }}
                        >
                            Validates against SARS requirements — VAT 15%, invoice type, required
                            fields
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
