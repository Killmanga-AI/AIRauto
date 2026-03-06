"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { UploadCloud, FileText, Image as ImageIcon, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

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
        if (type === "application/pdf") return <FileText className="h-4 w-4" />;
        return <ImageIcon className="h-4 w-4" />;
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
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Upload documents</h1>
                    <p className="mt-1 text-sm text-slate-600">
                        Upload PDF, JPG, or PNG. AIRAuto extracts fields and validates SARS compliance.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button asChild variant="secondary">
                        <Link href="/invoices">
                            View invoices
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UploadCloud className="h-4 w-4 text-primary" />
                        Drag & drop upload
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div
                        className={[
                            "rounded-lg border border-dashed p-10 text-center transition-colors",
                            dragOver ? "border-primary bg-primary/5" : "border-slate-200 bg-white",
                        ].join(" ")}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => inputRef.current?.click()}
                        role="button"
                        tabIndex={0}
                    >
                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-700">
                            <UploadCloud className="h-5 w-5" />
                        </div>
                        <div className="mt-3 text-sm font-semibold text-slate-900">
                            Drop invoices or receipts here
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                            or click to browse. Batch uploads supported (up to 50).
                        </div>
                        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">PDF</span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">JPG</span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">PNG</span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">≤ 10MB</span>
                        </div>

                        <input
                            ref={inputRef}
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            onChange={(e) => addFiles(e.target.files)}
                        />
                    </div>
                </CardContent>
            </Card>

            {files.length > 0 ? (
                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                                <CardTitle>
                                    Selected files{" "}
                                    <span className="text-xs font-medium text-slate-500">
                                        ({files.length})
                                    </span>
                                </CardTitle>
                                <div className="mt-1 text-xs text-slate-600">
                                    {doneCount} completed · {pendingCount} in progress
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {pendingCount > 0 ? (
                                    <Button onClick={simulateUpload}>Process files</Button>
                                ) : null}
                                {doneCount > 0 ? (
                                    <Button asChild variant="secondary">
                                        <Link href="/invoices">Review extracted invoices</Link>
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {files.map((entry) => {
                            const statusVariant =
                                entry.status === "done"
                                    ? "success"
                                    : entry.status === "error"
                                        ? "destructive"
                                        : entry.status === "processing"
                                            ? "warning"
                                            : "info";
                            return (
                                <div
                                    key={entry.id}
                                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-700">
                                            {getFileIcon(entry.file.type)}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-slate-900">
                                                {entry.file.name}
                                            </div>
                                            <div className="mt-0.5 text-xs text-slate-500">
                                                {formatBytes(entry.file.size)} · {getStatusText(entry.status)}
                                            </div>
                                            {(entry.status === "uploading" || entry.status === "processing") ? (
                                                <div className="mt-2">
                                                    <Progress value={entry.status === "processing" ? 100 : entry.progress} />
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant={
                                                statusVariant === "success"
                                                    ? "success"
                                                    : statusVariant === "destructive"
                                                        ? "destructive"
                                                        : statusVariant === "warning"
                                                            ? "warning"
                                                            : "info"
                                            }
                                        >
                                            {entry.status}
                                        </Badge>
                                        {entry.status === "pending" ? (
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                aria-label="Remove file"
                                                onClick={() => removeFile(entry.id)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        ) : null}
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            ) : null}
        </div>
    );
}
