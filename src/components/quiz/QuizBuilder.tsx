"use client";

import { useState, useEffect } from "react";
import { Plus, Save, Upload, FileUp, ArrowLeft, ClipboardList, Sparkles, Trash2, Eraser, Zap } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { Question, QuestionCard } from "@/components/quiz/QuestionCard";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardContent } from "@/components/ui/Card";
import * as mammoth from "mammoth";
import { useLanguage } from "@/contexts/LanguageContext";
import {
    saveQuizToFirestore,
    getQuizById,
    updateQuiz,
    QuizData,
    createNotification
} from "@/services/quizService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";

export default function QuizBuilder() {
    const { t } = useLanguage();
    const { user, login } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();
    const editId = searchParams.get("edit");

    const [questions, setQuestions] = useState<Question[]>([
        {
            id: "1",
            text: "",
            type: "single",
            options: ["", ""],
            correctAnswer: [],
            hint: "",
            explanation: "",
        },
    ]);

    const [title, setTitle] = useState(t.builder.untitled);
    const [description, setDescription] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(!!editId);
    const [quickPaste, setQuickPaste] = useState("");
    const [showQuickPaste, setShowQuickPaste] = useState(false);
    const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
    const [showRangeDeleteInput, setShowRangeDeleteInput] = useState(false);
    const [deleteRangeText, setDeleteRangeText] = useState("");
    const [showAnswerKeyPaste, setShowAnswerKeyPaste] = useState(false);
    const [answerKeyPaste, setAnswerKeyPaste] = useState("");

    // Load quiz for editing
    useEffect(() => {
        if (editId) {
            getQuizById(editId).then(data => {
                if (data) {
                    setTitle(data.title);
                    setDescription(data.description);
                    setQuestions(data.questions);
                }
                setIsLoading(false);
            }).catch(() => setIsLoading(false));
        }
    }, [editId]);

    const addQuestion = () => {
        const newQuestion: Question = {
            id: Math.random().toString(36).substr(2, 9),
            text: "",
            type: "single",
            options: ["", ""],
            correctAnswer: [],
            hint: "",
            explanation: "",
        };
        setQuestions([...questions, newQuestion]);
    };

    const updateQuestion = (id: string, updates: Partial<Question>) => {
        setQuestions(
            questions.map((q) => (q.id === id ? { ...q, ...updates } : q))
        );
    };

    const deleteQuestion = (id: string) => {
        if (questions.length === 1) return;
        setQuestions(questions.filter((q) => q.id !== id));
    };

    const duplicateQuestion = (id: string) => {
        const questionToCopy = questions.find(q => q.id === id);
        if (!questionToCopy) return;

        const newQuestion: Question = {
            ...questionToCopy,
            id: Math.random().toString(36).substr(2, 9),
        };

        const index = questions.findIndex(q => q.id === id);
        const newQuestions = [...questions];
        newQuestions.splice(index + 1, 0, newQuestion);
        setQuestions(newQuestions);
        toast.info("Đã nhân bản câu hỏi!");
    };

    const deleteAllQuestions = () => {
        setQuestions([{
            id: "1",
            text: "",
            type: "single",
            options: ["", ""],
            correctAnswer: [],
            hint: "",
            explanation: "",
        }]);
        toast.success("Đã xóa tất cả câu hỏi");
    };

    const deleteByRange = () => {
        if (!deleteRangeText.trim()) return;

        // Phân tích: "1-3, 5, 8" -> [1, 2, 3, 5, 8]
        const indicesToDelete = new Set<number>();
        const parts = deleteRangeText.split(",");

        parts.forEach(part => {
            const rangeMatch = part.match(/(\d+)\s*-\s*(\d+)/);
            if (rangeMatch) {
                const start = parseInt(rangeMatch[1]);
                const end = parseInt(rangeMatch[2]);
                for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
                    indicesToDelete.add(i - 1); // 0-indexed
                }
            } else {
                const num = parseInt(part.trim());
                if (!isNaN(num)) indicesToDelete.add(num - 1);
            }
        });

        const newQuestions = questions.filter((_, idx) => !indicesToDelete.has(idx));

        if (newQuestions.length === 0) {
            deleteAllQuestions();
        } else {
            setQuestions(newQuestions);
            toast.success(`Đã xóa ${indicesToDelete.size} câu hỏi theo yêu cầu`);
        }

        setDeleteRangeText("");
        setShowRangeDeleteInput(false);
    };

    const handleApplyAnswerKey = () => {
        if (!answerKeyPaste.trim()) return;

        const newQuestions = [...questions];
        let count = 0;

        // Hàm làm sạch chuỗi để so sánh: xóa dấu câu, khoảng trắng thừa, chuyển về chữ thường
        const normalize = (str: string) => {
            return str
                .toLowerCase()
                .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
                .replace(/\s+/g, " ")
                .trim();
        };

        const lines = answerKeyPaste.split('\n').map(l => l.trim()).filter(l => l !== "");

        lines.forEach((line, index) => {
            // 1. Phân tích dòng để lấy số câu (nếu có) và nội dung
            const numberedMatch = line.match(/^(\d+)[\.\:\-\)\s]*(.*)/i);
            const rawLabelMatch = line.match(/^([a-dA-D])[\.\:\-\)\s]*(.*)/i);

            let qIdx = index;
            let contentToMatch = line;

            if (numberedMatch) {
                qIdx = parseInt(numberedMatch[1]) - 1;
                contentToMatch = numberedMatch[2];
            } else if (rawLabelMatch) {
                contentToMatch = rawLabelMatch[2];
            }

            if (newQuestions[qIdx]) {
                const targetQ = newQuestions[qIdx];
                const normalizedKey = normalize(contentToMatch);

                if (!normalizedKey) return;

                let bestMatchIdx = -1;
                let maxSimilarity = 0;

                // 2. So khớp nội dung với từng option của câu hỏi đó
                targetQ.options.forEach((opt, optIdx) => {
                    const normalizedOpt = normalize(opt);
                    if (!normalizedOpt) return;

                    // Tính toán độ tương đồng đơn giản (chứa nhau hoặc bằng nhau)
                    let similarity = 0;
                    if (normalizedOpt === normalizedKey) {
                        similarity = 1.0;
                    } else if (normalizedKey.includes(normalizedOpt) || normalizedOpt.includes(normalizedKey)) {
                        // Tính theo tỉ lệ độ dài nếu có chứa nhau
                        similarity = Math.min(normalizedOpt.length, normalizedKey.length) / Math.max(normalizedOpt.length, normalizedKey.length);
                    }

                    if (similarity > maxSimilarity) {
                        maxSimilarity = similarity;
                        bestMatchIdx = optIdx;
                    }
                });

                // Nếu độ tương đồng đủ cao (trên 60%), hoặc khớp hoàn toàn nhãn A,B,C,D nếu nội dung ngắn
                if (maxSimilarity > 0.6) {
                    targetQ.correctAnswer = [targetQ.options[bestMatchIdx]];
                    count++;
                } else if (rawLabelMatch) {
                    // Fallback: Nếu không khớp nội dung nhưng có label A,B,C,D rõ ràng
                    const charCode = rawLabelMatch[1].toUpperCase().charCodeAt(0) - 65;
                    if (targetQ.options[charCode]) {
                        targetQ.correctAnswer = [targetQ.options[charCode]];
                        count++;
                    }
                }
            }
        });

        if (count > 0) {
            setQuestions(newQuestions);
            toast.success(`Đã tự động nhận diện và cập nhật ${count} đáp án dựa trên nội dung!`);
            setAnswerKeyPaste("");
            setShowAnswerKeyPaste(false);
        } else {
            toast.error("Không tìm thấy nội dung đáp án tương ứng trong các câu hỏi.");
        }
    };

    function finalizeQuestion(q: Partial<Question>): Question {
        return {
            id: q.id!,
            text: q.text?.trim() || "",
            type: (q.correctAnswer?.length || 0) > 1 ? "multiple" : (q.type as any || "single"),
            options: q.options?.length ? q.options : ["Lựa chọn A", "Lựa chọn B"],
            correctAnswer: q.correctAnswer || [],
            hint: q.hint || "",
            explanation: q.explanation || ""
        };
    }

    const parseTextToQuestions = (text: string) => {
        const lines = text.split('\n').map(l => l.trim());
        const newQuestions: Question[] = [];
        let currentQ: Partial<Question> | null = null;

        // Giai đoạn 1: Tách câu hỏi và lựa chọn
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line) continue;

            const questionMatch = line.match(/^(Câu|Question|Q)?\s*(\d+)[\.\:\/\-)]\s*(.*)/i);
            // Hỗ trợ A., B), [A], *A., **A.**
            const optionMatch = line.match(/^[\*\(\[]?([a-dA-D])[\.\:\/\-\)\]\*]{1,3}\s*(.*)/i);
            const answerLineMatch = line.match(/^(Đáp án|Answer|Ans)\s*[\:\-]?\s*([a-dA-D])/i);

            if (questionMatch) {
                if (currentQ) newQuestions.push(finalizeQuestion(currentQ));
                currentQ = {
                    id: Math.random().toString(36).substr(2, 9),
                    text: questionMatch[3] || line,
                    type: "single",
                    options: [],
                    correctAnswer: [],
                    hint: "",
                    explanation: ""
                };
            } else if (currentQ) {
                if (optionMatch) {
                    // Nhận diện đáp án đúng inline: *A, [A], **A**
                    const isInlineCorrect = line.startsWith('*') || line.includes('**') || (line.startsWith('[') && line.includes(']'));
                    const optText = optionMatch[2];
                    currentQ.options?.push(optText);
                    if (isInlineCorrect) currentQ.correctAnswer = [optText];
                } else if (answerLineMatch) {
                    const ansChar = answerLineMatch[2].toUpperCase();
                    const charCode = ansChar.charCodeAt(0) - 65;
                    if (currentQ.options && currentQ.options[charCode]) {
                        currentQ.correctAnswer = [currentQ.options[charCode]];
                    }
                } else {
                    currentQ.text += "\n" + line;
                }
            }
        }
        if (currentQ) newQuestions.push(finalizeQuestion(currentQ));

        // Giai đoạn 2: Tìm bảng đáp án ở cuối (nếu có)
        // Tìm đoạn text bắt đầu bằng "Đáp án", "Bảng đáp án", "Answer Key"
        const answerKeyIndex = lines.findIndex(l => l.match(/^(Đáp án|Bảng đáp án|Answer Key|Key)/i));
        if (answerKeyIndex !== -1) {
            const answerKeyLines = lines.slice(answerKeyIndex + 1);
            answerKeyLines.forEach(line => {
                // Khớp định dạng: "1.A", "2: B", "3-C", "4) D", "5A", "6 B"
                const matches = line.matchAll(/(\d+)[\.\:\-\)\s]*([a-dA-D])/gi);
                for (const match of matches) {
                    const qIdx = parseInt(match[1]) - 1;
                    const ansChar = match[2].toUpperCase();
                    const charCode = ansChar.charCodeAt(0) - 65;

                    if (newQuestions[qIdx]) {
                        const targetOption = newQuestions[qIdx].options[charCode];
                        if (targetOption) {
                            newQuestions[qIdx].correctAnswer = [targetOption];
                        }
                    }
                }
            });
        }

        return newQuestions;
    };

    const handleQuickPaste = () => {
        if (!quickPaste.trim()) return;
        const newQs = parseTextToQuestions(quickPaste);
        if (newQs.length > 0) {
            setQuestions(prev => [...prev.filter(q => q.text !== ""), ...newQs]);
            toast.success(`Đã thêm ${newQs.length} câu hỏi từ nội dung dán!`);
            setQuickPaste("");
            setShowQuickPaste(false);
        } else {
            toast.error("Không tìm thấy cấu trúc câu hỏi hợp lệ (ví dụ: Câu 1, A, B...)");
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const toastId = toast.loading("Đang phân tích tài liệu...");
        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            const newQuestions = parseTextToQuestions(result.value);

            if (newQuestions.length > 0) {
                setQuestions(prev => [...prev.filter(q => q.text !== ""), ...newQuestions]);
                toast.success(`Đã nhập thành công ${newQuestions.length} câu hỏi!`, { id: toastId });
            } else {
                toast.error("Không tìm thấy câu hỏi hợp lệ trong file.", { id: toastId });
            }
        } catch (error) {
            console.error("Failed to parse DOCX", error);
            toast.error("Lỗi khi đọc file DOCX", { id: toastId });
        } finally {
            setIsImporting(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleSave = async () => {
        if (!user) {
            toast.error("You must be logged in to save a quiz.");
            login();
            return;
        }

        if (!title.trim()) {
            toast.warning("Please enter a quiz title");
            return;
        }

        const toastId = toast.loading(editId ? "Updating quiz..." : "Saving quiz...");
        setIsSaving(true);
        let savedQuizId = editId;
        try {
            const quizData: QuizData = {
                title,
                description,
                questions,
                userId: user.uid,
                authorName: user.displayName || "Anonymous"
            };

            if (editId) {
                await updateQuiz(editId, quizData);
                toast.success("Quiz updated successfully!", { id: toastId });
            } else {
                savedQuizId = await saveQuizToFirestore(quizData);
                toast.success("Quiz saved successfully!", { id: toastId });
                router.push("/my-courses");
            }

            // Create notification for missing answers
            const missingIdx = questions.map((q, i) => q.correctAnswer.length === 0 ? i + 1 : null).filter(n => n !== null);
            if (missingIdx.length > 0 && savedQuizId) {
                await createNotification({
                    userId: user.uid,
                    type: 'missing_answer',
                    title: 'Lustio Alert: Khóa học còn thiếu đáp án!',
                    message: `Khóa học "${title}" của bạn còn thiếu đáp án ở các câu: ${missingIdx.join(', ')}. Hãy bổ sung để người học nhìn thấy chúng nhé!`,
                    link: `/questionbuilder?edit=${savedQuizId}`
                });
            }
        } catch (error: any) {
            console.error("Save error:", error);
            const msg = error.code === 'permission-denied'
                ? "Permission denied. Please check your Firestore Rules."
                : error.message || "Failed to save.";
            toast.error("Error: " + msg, { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="text-center py-20">Loading Quiz Data...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20 pt-10">
            {editId && (
                <Button variant="ghost" onClick={() => router.back()} className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Back
                </Button>
            )}

            {/* Quiz Header Info */}
            <div className="space-y-4 text-center">
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-center text-4xl font-extrabold bg-transparent border-none focus:outline-none placeholder-[rgb(var(--muted-foreground))] text-[rgb(var(--foreground))]"
                    placeholder={t.builder.untitled}
                />
                <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full max-w-2xl mx-auto text-center border-none resize-none shadow-none text-[rgb(var(--muted-foreground))] bg-transparent focus:ring-0"
                    placeholder={t.builder.descPlaceholder}
                    rows={1}
                />
            </div>

            {/* Jump to Empty Button */}
            {questions.some(q => q.correctAnswer.length === 0) && (
                <div className="sticky top-24 z-30 flex justify-center pointer-events-none">
                    <Button
                        size="sm"
                        onClick={() => {
                            const firstEmptyIdx = questions.findIndex(q => q.correctAnswer.length === 0);
                            const el = document.getElementById(`question-${questions[firstEmptyIdx].id}`);
                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        className="pointer-events-auto rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-lg border-none gap-2 animate-bounce"
                    >
                        <Zap className="h-4 w-4" /> Nhảy tới câu chưa có đáp án
                    </Button>
                </div>
            )}

            {/* Toolbar */}
            <div className="flex justify-between items-center gap-3">
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2 rounded-full"
                        onClick={() => setShowDeleteAllDialog(true)}
                    >
                        <Trash2 className="h-4 w-4" /> Xóa tất cả
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--secondary))/50] gap-2 rounded-full"
                        onClick={() => setShowRangeDeleteInput(!showRangeDeleteInput)}
                    >
                        <Eraser className="h-4 w-4" /> Xóa theo số
                    </Button>
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="gap-2 border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                        onClick={() => setShowQuickPaste(!showQuickPaste)}
                    >
                        <ClipboardList className="h-4 w-4" />
                        {showQuickPaste ? "Ẩn công cụ dán" : "Dán văn bản nhanh"}
                    </Button>
                    <Button
                        variant="outline"
                        className="gap-2 border-indigo-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        onClick={() => setShowAnswerKeyPaste(!showAnswerKeyPaste)}
                    >
                        <Sparkles className="h-4 w-4" />
                        {showAnswerKeyPaste ? "Ẩn bảng đáp án" : "Nhập bảng đáp án"}
                    </Button>
                    <div className="relative">
                        <input
                            type="file"
                            accept=".docx"
                            onChange={handleFileUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Button variant="outline" className="gap-2">
                            <FileUp className="h-4 w-4" />
                            {isImporting ? t.builder.importing : t.builder.importBtn}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Range Delete Input */}
            {showRangeDeleteInput && (
                <Card className="bg-red-50/30 dark:bg-red-950/10 border-red-500/20 animation-scale-in">
                    <CardContent className="pt-6 flex gap-4 items-end">
                        <div className="flex-1 space-y-2">
                            <label className="text-xs font-bold uppercase text-red-600">Xóa câu hỏi theo thứ tự</label>
                            <Input
                                placeholder="Ví dụ: 1-5, 8, 10"
                                value={deleteRangeText}
                                onChange={(e) => setDeleteRangeText(e.target.value)}
                                className="bg-white dark:bg-black/20"
                            />
                        </div>
                        <Button variant="destructive" onClick={deleteByRange} disabled={!deleteRangeText.trim()}>
                            Xóa ngay
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Quick Answer Key Paste Area */}
            {showAnswerKeyPaste && (
                <Card className="bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-500/20 animation-scale-in">
                    <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-emerald-500" /> Nhập nhanh bảng đáp án
                            </h3>
                            <span className="text-xs text-[rgb(var(--muted-foreground))]">
                                Dán nội dung đáp án (có kèm A. B. hoặc không), hệ thống sẽ tự tìm lựa chọn khớp nhất.
                            </span>
                        </div>
                        <Textarea
                            className="min-h-[100px] font-mono text-sm bg-white dark:bg-black/20"
                            placeholder="Dán bảng đáp án vào đây: 1A, 2.B, 3:C, 4-D..."
                            value={answerKeyPaste}
                            onChange={(e) => setAnswerKeyPaste(e.target.value)}
                        />
                        <div className="flex justify-end">
                            <Button onClick={handleApplyAnswerKey} disabled={!answerKeyPaste.trim()} className="rounded-full px-8 bg-emerald-600 hover:bg-emerald-700 text-white border-0">
                                Áp dụng đáp án
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Quick Paste Area */}
            {showQuickPaste && (
                <Card className="bg-indigo-50/30 dark:bg-indigo-950/10 border-indigo-500/20 animation-scale-in">
                    <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-indigo-500" /> Nhập liệu nhanh từ văn bản
                            </h3>
                            <span className="text-xs text-[rgb(var(--muted-foreground))]">
                                Hỗ trợ: Câu 1, A., B., C., D. (Dấu * cho đáp án đúng hoặc Bảng đáp án ở cuối)
                            </span>
                        </div>
                        <Textarea
                            className="min-h-[200px] font-mono text-sm bg-white dark:bg-black/20"
                            placeholder="Ví dụ:&#10;Câu 1: Thủ đô của Việt Nam là gì?&#10;A. TP.HCM&#10;*B. Hà Nội&#10;C. Đà Nẵng&#10;D. Cần Thơ"
                            value={quickPaste}
                            onChange={(e) => setQuickPaste(e.target.value)}
                        />
                        <div className="flex justify-end">
                            <Button onClick={handleQuickPaste} disabled={!quickPaste.trim()} className="rounded-full px-8">
                                Phân tích & Thêm câu hỏi
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6">
                {questions.map((q, index) => (
                    <div id={`question-${q.id}`} key={q.id}>
                        <QuestionCard
                            index={index}
                            question={q}
                            onUpdate={updateQuestion}
                            onDelete={deleteQuestion}
                            onDuplicate={duplicateQuestion}
                        />
                    </div>
                ))}
            </div>

            <div className="flex flex-col items-center gap-4 mt-8">
                <Button onClick={addQuestion} size="lg" className="w-full md:w-auto px-8 rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                    <Plus className="mr-2 h-5 w-5" /> {t.builder.addQuestion}
                </Button>
            </div>

            {/* Sticky Bottom Bar */}
            <div className="fixed bottom-6 left-0 right-0 px-6 pointer-events-none flex justify-center z-40">
                <div className="pointer-events-auto glass-card p-2 rounded-full flex gap-2 shadow-2xl backdrop-blur-xl bg-white/50 dark:bg-black/50 border border-white/20">
                    <Button variant="ghost" className="rounded-full hover:bg-black/5 dark:hover:bg-white/10" disabled={isSaving} onClick={() => router.back()}>
                        {t.builder.cancel}
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="rounded-full px-8 bg-gradient-to-r from-indigo-500 to-purple-600 border-0 hover:opacity-90 min-w-[140px]"
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        {isSaving ? (editId ? "Updating..." : "Saving...") : (editId ? "Update Quiz" : t.builder.save)}
                    </Button>
                </div>
            </div>

            <ConfirmDialog
                isOpen={showDeleteAllDialog}
                title="Xóa tất cả câu hỏi?"
                description="Hành động này sẽ xóa toàn bộ danh sách câu hỏi hiện tại. Bạn không thể hoàn tác thao tác này."
                confirmText="Xóa hết"
                cancelText="Hủy"
                variant="danger"
                onConfirm={deleteAllQuestions}
                onCancel={() => setShowDeleteAllDialog(false)}
            />
        </div>
    );
}
