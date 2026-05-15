"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { AlertCircle, Flag, X } from "lucide-react";

interface ReportDialogProps {
    isOpen: boolean;
    title: string;
    questionText: string;
    onConfirm: (reason: string) => void;
    onCancel: () => void;
    language?: string;
}

export function ReportDialog({
    isOpen,
    title,
    questionText,
    onConfirm,
    onCancel,
    language = 'vi'
}: ReportDialogProps) {
    const [mounted, setMounted] = useState(false);
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setReason("");
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; }
    }, [isOpen]);

    if (!mounted || !isOpen) return null;

    const handleSubmit = async () => {
        if (!reason.trim()) return;
        setIsSubmitting(true);
        await onConfirm(reason);
        setIsSubmitting(false);
        onCancel();
    };

    const t = {
        vi: {
            title: "Báo cáo / Góp ý",
            description: "Hãy cho chúng tôi biết vấn đề hoặc nhận xét của bạn về câu hỏi này.",
            placeholder: "Nhập nội dung báo cáo hoặc nhận xét của bạn ở đây...",
            cancel: "Hủy",
            submit: "Gửi phản hồi",
            submitting: "Đang gửi...",
            questionLabel: "Câu hỏi:"
        },
        en: {
            title: "Report / Feedback",
            description: "Please let us know your issue or comment about this question.",
            placeholder: "Enter your report or comment here...",
            cancel: "Cancel",
            submit: "Submit Feedback",
            submitting: "Submitting...",
            questionLabel: "Question:"
        }
    }[language === 'vi' ? 'vi' : 'en'];

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onCancel}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-white dark:bg-zinc-900 p-8 shadow-2xl ring-1 ring-zinc-900/5 transition-all transform scale-100 opacity-100 animate-in fade-in zoom-in-95 duration-200">
                <button 
                    onClick={onCancel}
                    className="absolute top-6 right-6 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-red-100 dark:bg-red-900/20 text-red-600 flex items-center justify-center shrink-0">
                            <Flag className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                {t.title}
                            </h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                {t.description}
                            </p>
                        </div>
                    </div>

                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">{t.questionLabel}</p>
                        <p className="text-sm font-medium line-clamp-2 italic">"{questionText}"</p>
                    </div>

                    <div className="space-y-2">
                        <Textarea
                            placeholder={t.placeholder}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="min-h-[120px] rounded-2xl resize-none border-2 focus:border-red-500 transition-all"
                        />
                    </div>

                    <div className="flex gap-3 w-full">
                        <Button
                            variant="ghost"
                            onClick={onCancel}
                            className="flex-1 h-12 rounded-xl font-bold"
                        >
                            {t.cancel}
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!reason.trim() || isSubmitting}
                            className="flex-1 h-12 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20"
                        >
                            {isSubmitting ? t.submitting : t.submit}
                        </Button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
