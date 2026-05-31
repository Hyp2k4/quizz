"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getQuizById, QuizData } from "@/services/quizService";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    Eye,
    EyeOff,
    CheckCircle2,
    XCircle,
    Brain,
    Keyboard,
    BookOpen,
    Sparkles,
    Trophy,
    ListChecks,
} from "lucide-react";

// ────────────── Types ──────────────

interface LineState {
    text: string;
    status: "pending" | "revealed" | "known" | "unknown";
}

// ────────────── Helpers ──────────────

/** Split a long text into meaningful lines, filtering out blank lines and HTML */
function splitIntoLines(text: string): string[] {
    // Convert <br> and </p> to newlines, then strip all other HTML tags
    const cleanText = text
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<[^>]*>?/gm, "")
        .replace(/&nbsp;/g, " ");

    // Split by newline or sentence-ending punctuation followed by space (optional, but newline is safer)
    return cleanText
        .split(/\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
}

/** Simple char-by-char diff result */
function diffChars(
    expected: string,
    typed: string
): { char: string; correct: boolean }[] {
    const result: { char: string; correct: boolean }[] = [];
    const maxLen = Math.max(expected.length, typed.length);
    for (let i = 0; i < maxLen; i++) {
        const expChar = expected[i] ?? "";
        const typedChar = typed[i] ?? "";
        if (expChar) {
            result.push({ char: expChar, correct: expChar === typedChar });
        }
    }
    return result;
}

/** Normalise for loose comparison (ignore punctuation, special quotes, case) */
function normalise(s: string) {
    return s
        .toLowerCase()
        // Loại bỏ các dấu câu, ký tự đặc biệt, ngoặc kép cong, gạch ngang dài...
        .replace(/[.,/#!$%^&*;:{}=\-_`~()"'""''“”‘’—–]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

// ────────────── Progress Persistence ──────────────

const STORAGE_KEY = (quizId: string, qIndex: number) =>
    `memorize_${quizId}_q${qIndex}`;

function loadProgress(quizId: string, qIndex: number): number[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY(quizId, qIndex));
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveProgress(quizId: string, qIndex: number, knownIndices: number[]) {
    try {
        localStorage.setItem(
            STORAGE_KEY(quizId, qIndex),
            JSON.stringify(knownIndices)
        );
    } catch {}
}

// ────────────── Sub-components ──────────────

function ProgressBar({ value, max }: { value: number; max: number }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div className="w-full">
            <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                />
            </div>
            <p className="text-xs text-zinc-400 font-bold mt-1 text-right">
                {value}/{max} {pct}%
            </p>
        </div>
    );
}

/** Single line card in learn mode */
function LineCard({
    line,
    index,
    total,
    onKnown,
    onUnknown,
    language,
}: {
    line: LineState;
    index: number;
    total: number;
    onKnown: () => void;
    onUnknown: () => void;
    language: string;
}) {
    const [revealed, setRevealed] = useState(line.status === "revealed");

    const reveal = () => setRevealed(true);

    return (
        <motion.div
            key={index}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-2xl mx-auto"
        >
            {/* Line counter */}
            <p className="text-xs font-black uppercase tracking-widest text-zinc-400 text-center mb-4">
                {language === "vi" ? "Dòng" : "Line"} {index + 1} / {total}
            </p>

            {/* Card */}
            <div
                className={`rounded-[2rem] p-8 md:p-10 text-center shadow-2xl border-2 transition-all duration-500 min-h-[200px] flex flex-col items-center justify-center gap-6 ${
                    revealed
                        ? "bg-white dark:bg-zinc-900 border-indigo-200 dark:border-indigo-800"
                        : "bg-gradient-to-br from-indigo-600 to-violet-600 border-transparent"
                }`}
            >
                {revealed ? (
                    <>
                        <p
                            className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: line.text }}
                        />
                        <div className="flex gap-3 mt-2">
                            <Button
                                onClick={onUnknown}
                                variant="outline"
                                className="rounded-2xl border-2 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 font-bold gap-2 h-12 px-6"
                            >
                                <XCircle className="h-5 w-5" />
                                {language === "vi" ? "Chưa nhớ" : "Not yet"}
                            </Button>
                            <Button
                                onClick={onKnown}
                                className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 h-12 px-6 shadow-lg shadow-emerald-500/20"
                            >
                                <CheckCircle2 className="h-5 w-5" />
                                {language === "vi" ? "Đã nhớ!" : "Got it!"}
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="space-y-3">
                            <div className="flex gap-1 justify-center flex-wrap max-w-sm">
                                {line.text.split(" ").map((word, wi) => (
                                    <span
                                        key={wi}
                                        className="inline-block h-3 rounded bg-white/30 mb-1"
                                        style={{
                                            width: `${Math.max(
                                                word.length * 9,
                                                24
                                            )}px`,
                                        }}
                                    />
                                ))}
                            </div>
                            <p className="text-white/60 text-sm font-medium">
                                {language === "vi"
                                    ? "Hãy cố nhớ câu này..."
                                    : "Try to recall this line..."}
                            </p>
                        </div>
                        <Button
                            onClick={reveal}
                            className="rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold gap-2 h-12 px-8 border border-white/30"
                        >
                            <Eye className="h-5 w-5" />
                            {language === "vi" ? "Hiện dòng này" : "Reveal"}
                        </Button>
                    </>
                )}
            </div>
        </motion.div>
    );
}

/** Single line card in type mode */
function TypeCard({
    line,
    index,
    total,
    onNext,
    language,
}: {
    line: LineState;
    index: number;
    total: number;
    onNext: (correct: boolean) => void;
    language: string;
}) {
    const [typed, setTyped] = useState("");
    const [checked, setChecked] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setTyped("");
        setChecked(false);
        setIsCorrect(false);
        setTimeout(() => inputRef.current?.focus(), 100);
    }, [index]);

    const handleCheck = () => {
        const correct = normalise(typed) === normalise(line.text);
        setIsCorrect(correct);
        setChecked(true);
    };

    const diff = checked ? diffChars(line.text, typed) : [];

    return (
        <motion.div
            key={index}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-2xl mx-auto space-y-4"
        >
            <p className="text-xs font-black uppercase tracking-widest text-zinc-400 text-center">
                {language === "vi" ? "Dòng" : "Line"} {index + 1} / {total}
            </p>

            {/* Hint: first word */}
            <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-5 py-3 text-center">
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mb-1">
                    {language === "vi" ? "Chữ đầu tiên" : "First word"}
                </p>
                <p className="font-bold text-zinc-700 dark:text-zinc-300">
                    {line.text.split(" ")[0]}
                    <span className="text-zinc-300 dark:text-zinc-600">
                        {" "}
                        · {line.text.split(" ").length}{" "}
                        {language === "vi" ? "từ" : "words"}
                    </span>
                </p>
            </div>

            {/* Input */}
            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border-2 border-zinc-200 dark:border-zinc-700 p-6 shadow-lg space-y-4 focus-within:border-indigo-400 transition-colors">
                <textarea
                    ref={inputRef}
                    className="w-full bg-transparent text-lg font-medium text-zinc-900 dark:text-zinc-100 resize-none outline-none min-h-[80px] placeholder-zinc-300 dark:placeholder-zinc-600"
                    placeholder={
                        language === "vi"
                            ? "Gõ lại câu này..."
                            : "Type this line..."
                    }
                    value={typed}
                    onChange={(e) => !checked && setTyped(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && e.ctrlKey) {
                            if (!checked) handleCheck();
                        }
                    }}
                    disabled={checked}
                />

                {/* Diff result */}
                {checked && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border-t border-zinc-100 dark:border-zinc-800 pt-4"
                    >
                        <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mb-2">
                            {language === "vi" ? "So sánh" : "Comparison"}
                        </p>
                        <div className="text-base font-medium leading-relaxed flex flex-wrap gap-0.5">
                            {diff.map((d, i) => (
                                <span
                                    key={i}
                                    className={
                                        d.correct
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : "text-red-500 bg-red-50 dark:bg-red-950/30 rounded px-0.5"
                                    }
                                >
                                    {d.char}
                                </span>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Actions */}
            <div className="flex justify-center gap-3">
                {!checked ? (
                    <Button
                        onClick={handleCheck}
                        disabled={typed.trim().length === 0}
                        className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 h-12 px-8 shadow-lg shadow-indigo-500/20"
                    >
                        <Sparkles className="h-4 w-4" />
                        {language === "vi" ? "Kiểm tra (Ctrl+Enter)" : "Check (Ctrl+Enter)"}
                    </Button>
                ) : (
                    <>
                        <div
                            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm ${
                                isCorrect
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                    : "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                            }`}
                        >
                            {isCorrect ? (
                                <CheckCircle2 className="h-4 w-4" />
                            ) : (
                                <XCircle className="h-4 w-4" />
                            )}
                            {isCorrect
                                ? language === "vi"
                                    ? "Hoàn toàn chính xác!"
                                    : "Correct!"
                                : language === "vi"
                                ? "Có lỗi – hãy xem lại"
                                : "Some errors – review above"}
                        </div>
                        <Button
                            onClick={() => onNext(isCorrect)}
                            className="rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold gap-2 h-12 px-8"
                        >
                            {language === "vi" ? "Tiếp theo" : "Next"}
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </>
                )}
            </div>
        </motion.div>
    );
}

// ────────────── Overview (question picker) ──────────────

function QuestionPicker({
    quiz,
    onSelect,
    language,
}: {
    quiz: QuizData;
    onSelect: (index: number) => void;
    language: string;
}) {
    const memorisableQuestions = quiz.questions.filter((q) => {
        if (q.type !== "open" || !q.text) return false;
        return q.text.replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, " ").trim().length > 50;
    });

    if (memorisableQuestions.length === 0) {
        return (
            <div className="text-center py-20 space-y-4">
                <div className="mx-auto w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                    <BookOpen className="h-8 w-8 text-zinc-400" />
                </div>
                <h2 className="text-xl font-bold text-zinc-500">
                    {language === "vi"
                        ? "Không có nội dung để học thuộc"
                        : "No memorisable content"}
                </h2>
                <p className="text-sm text-zinc-400 max-w-sm mx-auto">
                    {language === "vi"
                        ? "Thêm câu hỏi loại Tự luận với nội dung văn bản dài (thơ, đoạn văn, định lý...) trong phần tạo bài."
                        : "Add Open Ended questions with long text content (poems, passages, theorems...) in the quiz builder."}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-black text-center">
                {language === "vi"
                    ? "Chọn bài để học thuộc"
                    : "Choose a passage to memorise"}
            </h2>
            <div className="grid gap-4">
                {quiz.questions.map((q, idx) => {
                    if (q.type !== "open" || !q.text) return null;
                    const plainText = q.text
                        .replace(/<br\s*\/?>/gi, "\n")
                        .replace(/<\/p>/gi, "\n")
                        .replace(/<[^>]*>?/gm, "")
                        .replace(/&nbsp;/g, " ")
                        .trim();
                    if (plainText.length <= 50) return null;
                    
                    const lines = splitIntoLines(q.text);
                    return (
                        <button
                            key={idx}
                            onClick={() => onSelect(idx)}
                            className="group w-full text-left bg-white dark:bg-zinc-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-[2rem] p-6 border-2 border-zinc-100 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-sm hover:shadow-lg"
                        >
                            <div className="flex items-start gap-4">
                                <div className="h-12 w-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <Brain className="h-6 w-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm md:text-base whitespace-pre-wrap break-words">
                                        {plainText}
                                    </p>
                                    <p className="text-xs text-zinc-400 mt-2">
                                        {lines.length}{" "}
                                        {language === "vi" ? "dòng" : "lines"}
                                    </p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-zinc-300 group-hover:text-indigo-500 transition-colors shrink-0 mt-1" />
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ────────────── Completion Screen ──────────────

function CompletionScreen({
    known,
    total,
    onRestart,
    onBack,
    language,
}: {
    known: number;
    total: number;
    onRestart: () => void;
    onBack: () => void;
    language: string;
}) {
    const pct = total > 0 ? Math.round((known / total) * 100) : 0;
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-8 py-12 max-w-md mx-auto"
        >
            <div className="mx-auto w-24 h-24 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-500 rounded-full flex items-center justify-center animate-bounce">
                <Trophy className="h-12 w-12" />
            </div>
            <div>
                <h2 className="text-3xl font-black mb-2">
                    {language === "vi" ? "Tuyệt vời!" : "Well done!"}
                </h2>
                <p className="text-zinc-500">
                    {language === "vi"
                        ? `Bạn đã thuộc ${known}/${total} dòng (${pct}%)`
                        : `You memorised ${known}/${total} lines (${pct}%)`}
                </p>
            </div>

            {/* Score ring */}
            <div className="relative w-32 h-32 mx-auto">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="10" className="text-zinc-100 dark:text-zinc-800" />
                    <circle
                        cx="60" cy="60" r="50" fill="none"
                        stroke="url(#grad)" strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 50}`}
                        strokeDashoffset={`${2 * Math.PI * 50 * (1 - pct / 100)}`}
                        className="transition-all duration-1000"
                    />
                    <defs>
                        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#6366f1" />
                        </linearGradient>
                    </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100">{pct}%</span>
                </div>
            </div>

            <div className="flex justify-center gap-4">
                <Button onClick={onRestart} variant="outline" className="rounded-2xl gap-2 font-bold px-6 h-12">
                    <RotateCcw className="h-4 w-4" />
                    {language === "vi" ? "Học lại" : "Restart"}
                </Button>
                <Button onClick={onBack} className="rounded-2xl gap-2 font-bold px-6 h-12 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20">
                    <ArrowLeft className="h-4 w-4" />
                    {language === "vi" ? "Về bài học" : "Back"}
                </Button>
            </div>
        </motion.div>
    );
}

// ────────────── Main Page ──────────────

type Mode = "learn" | "type";
type Stage = "pick" | "session" | "done";

export default function MemorizePage() {
    const { id } = useParams();
    const router = useRouter();
    const { language } = useLanguage();

    const [quiz, setQuiz] = useState<QuizData | null>(null);
    const [loading, setLoading] = useState(true);

    // Session state
    const [stage, setStage] = useState<Stage>("pick");
    const [mode, setMode] = useState<Mode>("learn");
    const [selectedQIndex, setSelectedQIndex] = useState<number>(-1);
    const [lines, setLines] = useState<LineState[]>([]);
    const [currentLine, setCurrentLine] = useState(0);
    const [knownCount, setKnownCount] = useState(0);

    useEffect(() => {
        if (id) {
            getQuizById(id as string).then((data) => {
                setQuiz(data);
                setLoading(false);
            });
        }
    }, [id]);

    const startSession = useCallback(
        (qIndex: number, m: Mode) => {
            if (!quiz) return;
            const q = quiz.questions[qIndex];
            const rawLines = splitIntoLines(q.text);

            // Load saved progress
            const savedKnown = loadProgress(quiz.id!, qIndex);

            const initialLines: LineState[] = rawLines.map((text, i) => ({
                text,
                status: savedKnown.includes(i) ? "known" : "pending",
            }));

            setLines(initialLines);
            setCurrentLine(0);
            setKnownCount(savedKnown.length);
            setSelectedQIndex(qIndex);
            setMode(m);
            setStage("session");
        },
        [quiz]
    );

    const handleKnown = () => {
        if (!quiz) return;
        const newLines = [...lines];
        newLines[currentLine] = { ...newLines[currentLine], status: "known" };
        setLines(newLines);

        const newKnown = newLines.filter((l) => l.status === "known").length;
        setKnownCount(newKnown);
        saveProgress(
            quiz.id!,
            selectedQIndex,
            newLines.map((l, i) => (l.status === "known" ? i : -1)).filter((i) => i !== -1)
        );

        if (currentLine < lines.length - 1) {
            setCurrentLine((prev) => prev + 1);
        } else {
            setStage("done");
        }
    };

    const handleUnknown = () => {
        const newLines = [...lines];
        newLines[currentLine] = { ...newLines[currentLine], status: "unknown" };
        setLines(newLines);

        if (currentLine < lines.length - 1) {
            setCurrentLine((prev) => prev + 1);
        } else {
            setStage("done");
        }
    };

    const handleTypeNext = (correct: boolean) => {
        if (!quiz) return;
        const newLines = [...lines];
        newLines[currentLine] = {
            ...newLines[currentLine],
            status: correct ? "known" : "unknown",
        };
        setLines(newLines);
        const newKnown = newLines.filter((l) => l.status === "known").length;
        setKnownCount(newKnown);
        saveProgress(
            quiz.id!,
            selectedQIndex,
            newLines.map((l, i) => (l.status === "known" ? i : -1)).filter((i) => i !== -1)
        );

        if (currentLine < lines.length - 1) {
            setCurrentLine((prev) => prev + 1);
        } else {
            setStage("done");
        }
    };

    const handleRestart = () => {
        const pristineLines: LineState[] = lines.map((l) => ({
            ...l,
            status: "pending",
        }));
        setLines(pristineLines);
        setCurrentLine(0);
        setKnownCount(0);
        setStage("session");
        if (quiz) saveProgress(quiz.id!, selectedQIndex, []);
    };

    const goToPick = () => {
        setStage("pick");
        setSelectedQIndex(-1);
    };

    if (loading)
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="h-10 w-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
            </div>
        );
    if (!quiz)
        return (
            <div className="min-h-screen flex items-center justify-center text-zinc-400">
                Not found
            </div>
        );

    return (
        <div className="min-h-screen bg-[rgb(var(--background))]">
            <Navbar />
            <main className="pt-28 pb-24 px-4 md:px-6 max-w-3xl mx-auto">

                {/* ── Header ── */}
                <div className="mb-8 flex items-center justify-between gap-4">
                    <Button
                        variant="ghost"
                        onClick={() =>
                            stage === "session" || stage === "done"
                                ? goToPick()
                                : router.back()
                        }
                        className="gap-2 rounded-full font-bold"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {stage !== "pick"
                            ? language === "vi"
                                ? "Chọn bài khác"
                                : "Back to list"
                            : language === "vi"
                            ? "Quay lại"
                            : "Back"}
                    </Button>

                    <div className="text-center">
                        <h1 className="text-lg font-black text-zinc-900 dark:text-zinc-100 truncate max-w-[180px] md:max-w-xs">
                            {quiz.title}
                        </h1>
                        <p className="text-xs text-indigo-500 font-bold uppercase tracking-widest flex items-center justify-center gap-1">
                            <Brain className="h-3 w-3" />
                            {language === "vi" ? "Học thuộc lòng" : "Memorize"}
                        </p>
                    </div>

                    {/* Mode toggle (only in session) */}
                    {stage === "session" && (
                        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-full p-1">
                            <button
                                onClick={() => setMode("learn")}
                                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1 ${
                                    mode === "learn"
                                        ? "bg-white dark:bg-zinc-700 shadow text-indigo-600 dark:text-indigo-400"
                                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                }`}
                            >
                                <Eye className="h-3 w-3" />
                                {language === "vi" ? "Nhớ" : "Learn"}
                            </button>
                            <button
                                onClick={() => setMode("type")}
                                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1 ${
                                    mode === "type"
                                        ? "bg-white dark:bg-zinc-700 shadow text-indigo-600 dark:text-indigo-400"
                                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                }`}
                            >
                                <Keyboard className="h-3 w-3" />
                                {language === "vi" ? "Gõ" : "Type"}
                            </button>
                        </div>
                    )}

                    {stage === "pick" && <div className="w-20" />}
                    {stage === "done" && <div className="w-20" />}
                </div>

                {/* ── Stage: Pick ── */}
                {stage === "pick" && (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="pick"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            {/* Mode selector */}
                            <div className="mb-8 grid grid-cols-2 gap-4">
                                {(["learn", "type"] as Mode[]).map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setMode(m)}
                                        className={`rounded-[2rem] p-5 text-left border-2 transition-all ${
                                            mode === m
                                                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                                                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            {m === "learn" ? (
                                                <Eye className="h-5 w-5 text-indigo-500" />
                                            ) : (
                                                <Keyboard className="h-5 w-5 text-violet-500" />
                                            )}
                                            <span className="font-black text-sm">
                                                {m === "learn"
                                                    ? language === "vi"
                                                        ? "Chế độ Nhìn & Nhớ"
                                                        : "Look & Remember"
                                                    : language === "vi"
                                                    ? "Chế độ Gõ lại"
                                                    : "Type it Out"}
                                            </span>
                                        </div>
                                        <p className="text-xs text-zinc-400 leading-relaxed">
                                            {m === "learn"
                                                ? language === "vi"
                                                    ? "Hiện từng dòng, bạn tự đánh giá đã nhớ hay chưa"
                                                    : "Reveal each line, self-assess if you remember it"
                                                : language === "vi"
                                                ? "Gõ lại từng dòng, hệ thống highlight lỗi sai"
                                                : "Type each line, errors are highlighted in real time"}
                                        </p>
                                    </button>
                                ))}
                            </div>

                            <QuestionPicker
                                quiz={quiz}
                                onSelect={(idx) => startSession(idx, mode)}
                                language={language}
                            />
                        </motion.div>
                    </AnimatePresence>
                )}

                {/* ── Stage: Session ── */}
                {stage === "session" && lines.length > 0 && (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="session"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-6"
                        >
                            {/* Progress */}
                            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-5 border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                                        {language === "vi" ? "Tiến trình" : "Progress"}
                                    </span>
                                    <span className="text-xs font-bold text-emerald-600">
                                        {knownCount} {language === "vi" ? "đã thuộc" : "memorised"}
                                    </span>
                                </div>
                                <ProgressBar value={knownCount} max={lines.length} />

                                {/* Line status dots */}
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {lines.map((l, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentLine(i)}
                                            className={`w-6 h-6 rounded-lg text-[10px] font-bold transition-all ${
                                                i === currentLine
                                                    ? "bg-indigo-600 text-white scale-110 shadow-lg"
                                                    : l.status === "known"
                                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                    : l.status === "unknown"
                                                    ? "bg-red-100 text-red-500 dark:bg-red-900/30"
                                                    : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                                            }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Active line card */}
                            <AnimatePresence mode="wait">
                                {mode === "learn" ? (
                                    <LineCard
                                        key={`learn-${currentLine}`}
                                        line={lines[currentLine]}
                                        index={currentLine}
                                        total={lines.length}
                                        onKnown={handleKnown}
                                        onUnknown={handleUnknown}
                                        language={language}
                                    />
                                ) : (
                                    <TypeCard
                                        key={`type-${currentLine}`}
                                        line={lines[currentLine]}
                                        index={currentLine}
                                        total={lines.length}
                                        onNext={handleTypeNext}
                                        language={language}
                                    />
                                )}
                            </AnimatePresence>

                            {/* Nav bar */}
                            <div className="flex justify-between items-center">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentLine === 0}
                                    onClick={() => setCurrentLine((p) => Math.max(0, p - 1))}
                                    className="rounded-2xl gap-1 font-bold"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    {language === "vi" ? "Trước" : "Prev"}
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleRestart}
                                    className="rounded-2xl gap-1 text-zinc-400"
                                >
                                    <RotateCcw className="h-3 w-3" />
                                    {language === "vi" ? "Học lại" : "Restart"}
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentLine === lines.length - 1}
                                    onClick={() =>
                                        setCurrentLine((p) =>
                                            Math.min(lines.length - 1, p + 1)
                                        )
                                    }
                                    className="rounded-2xl gap-1 font-bold"
                                >
                                    {language === "vi" ? "Sau" : "Next"}
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                )}

                {/* ── Stage: Done ── */}
                {stage === "done" && (
                    <CompletionScreen
                        known={knownCount}
                        total={lines.length}
                        onRestart={handleRestart}
                        onBack={goToPick}
                        language={language}
                    />
                )}
            </main>
        </div>
    );
}
