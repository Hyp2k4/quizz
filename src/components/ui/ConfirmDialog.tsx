"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "info";
}

export function ConfirmDialog({
    isOpen,
    title,
    description,
    onConfirm,
    onCancel,
    confirmText = "Continue",
    cancelText = "Cancel",
    variant = "info"
}: ConfirmDialogProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; }
    }, [isOpen]);

    if (!mounted || !isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onCancel}
            />

            {/* Modal */}
            <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl ring-1 ring-zinc-900/5 transition-all transform scale-100 opacity-100 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center gap-4">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${variant === 'danger' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                        <AlertTriangle className="h-6 w-6" />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            {title}
                        </h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {description}
                        </p>
                    </div>

                    <div className="flex gap-3 w-full mt-2">
                        <Button
                            variant="ghost"
                            onClick={onCancel}
                            className="flex-1 rounded-xl"
                        >
                            {cancelText}
                        </Button>
                        <Button
                            onClick={() => { onConfirm(); onCancel(); }}
                            className={`flex-1 rounded-xl shadow-lg border-0 ${variant === 'danger' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                        >
                            {confirmText}
                        </Button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
