"use client";

import { useState, useEffect } from "react";
import { Plus, Save, Upload, FileUp, ArrowLeft, ClipboardList, Sparkles, Trash2, Eraser, Zap, X, Search, BookOpen, RotateCcw } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { Question, QuestionCard } from "@/components/quiz/QuestionCard";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardContent } from "@/components/ui/Card";
import * as mammoth from "mammoth";
import { useLanguage } from "@/contexts/LanguageContext";
import { uploadImageToCloudinary } from "@/services/cloudinaryService";
import {
    saveQuizToFirestore,
    getQuizById,
    updateQuiz,
    QuizData,
    createNotification,
    updateQuizPresence,
    subscribeToQuizPresence,
    removeQuizPresence,
    UserPresence
} from "@/services/quizService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

type DraftQuestion = Partial<Question> & {
    pendingAnswerIndex?: number;
    optionStyle?: "letter" | "number";
};

/** A → 0 … D → 3, hoặc số 1–4 → chỉ số lựa chọn. */
function answerTokenToIndex(token: string): number {
    const t = token.trim().toUpperCase();
    if (/^[A-D]$/.test(t)) return t.charCodeAt(0) - 65;
    if (/^[1-4]$/.test(t)) return parseInt(t, 10) - 1;
    return -1;
}

/** Bỏ nhãn A. / B) / [C] đứng đầu nội dung lựa chọn 1–4. */
function stripLeadingLetterLabel(raw: string): string {
    const stripped = raw.replace(
        /^((?:\s|<\/?(?:u|ins|b|strong|mark)\b[^>]*>|\*|[\(\[])*)[a-dA-D][\.\:\/\-\)\]\*]{1,3}\s*/i,
        "$1"
    ).trim();
    return stripped || raw.trim();
}

type AnswerAssignment = { qIdx: number; letterIndex: number; content: string };

function answerKeyPlainText(raw: string): string {
    return raw
        .replace(/<\/tr>/gi, "\n")
        .replace(/<\/t[dh]>/gi, "\t")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/[ \t]+\n/g, "\n");
}

/** Tách bảng đáp án: 1A, 1.A, "Câu 1  A", hoặc nội dung đáp án theo số câu. */
function parseAnswerKey(raw: string): AnswerAssignment[] {
    const lines = answerKeyPlainText(raw).split(/\n/).map(l => l.trim()).filter(Boolean);
    const numbered: AnswerAssignment[] = [];
    const sequentialLetters: number[] = [];
    let sawNumbered = false;
    const pairSource = "(?:(?:câu|question|q)\\s*)?(\\d+)\\s*[\\.\\:\\\\)\\-]?\\s*(?:(?:đáp án|answer|ans|đa)\\s*[:\\-]?\\s*)?([a-dA-D])\\b";

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].replace(/^(?:bảng\s+)?(?:đáp án|answer key|answers|key)\s*[:\-]?\s*/i, "").trim();
        if (!line) continue;

        const pairs = [...line.matchAll(new RegExp(pairSource, "gi"))];
        if (pairs.length > 0) {
            const leftover = line
                .replace(new RegExp(pairSource, "gi"), " ")
                .replace(/[\s,;|./\\\-–—:]+/g, " ")
                .trim();
            const pure = leftover.length === 0 || (pairs.length >= 2 && leftover.length < 8);
            sawNumbered = true;
            if (pure) {
                for (const p of pairs) {
                    numbered.push({
                        qIdx: parseInt(p[1], 10) - 1,
                        letterIndex: answerTokenToIndex(p[2]),
                        content: ""
                    });
                }
            } else if (pairs.length === 1) {
                numbered.push({
                    qIdx: parseInt(pairs[0][1], 10) - 1,
                    letterIndex: answerTokenToIndex(pairs[0][2]),
                    content: leftover
                });
            }
            continue;
        }

        const contentLine = line.match(/^(?:(?:câu|question|q)\s*)?(\d+)\s*[\.\:\)\-]\s+(.+)$/i);
        if (contentLine) {
            sawNumbered = true;
            const body = contentLine[2].trim();
            const choiceNo = body.match(/^([1-4])$/);
            const embedded = body.match(/^([a-dA-D])[\.\:\-\)\s]+(.*)$/i);
            numbered.push({
                qIdx: parseInt(contentLine[1], 10) - 1,
                letterIndex: choiceNo
                    ? answerTokenToIndex(choiceNo[1])
                    : embedded
                        ? answerTokenToIndex(embedded[1])
                        : -1,
                content: choiceNo ? "" : embedded ? embedded[2].trim() : body
            });
            continue;
        }

        if (/^[a-dA-D]$/i.test(line)) {
            const prev = lines[i - 1]?.replace(/^(?:bảng\s+)?(?:đáp án|answer key|answers|key)\s*[:\-]?\s*/i, "").trim() ?? "";
            const prevNo = prev.match(/^(?:(?:câu|question|q)\s*)?(\d+)$/i);
            if (prevNo) {
                sawNumbered = true;
                numbered.push({
                    qIdx: parseInt(prevNo[1], 10) - 1,
                    letterIndex: answerTokenToIndex(line),
                    content: ""
                });
            } else {
                sequentialLetters.push(answerTokenToIndex(line));
            }
        }
    }

    if (!sawNumbered && sequentialLetters.length > 0) {
        return sequentialLetters.map((letterIndex, qIdx) => ({ qIdx, letterIndex, content: "" }));
    }
    return numbered;
}

function bestOptionIndex(options: string[], content: string): number {
    const normalize = (str: string) => str
        .toLowerCase()
        .replace(/<[^>]+>/g, " ")
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    const normalizedKey = normalize(stripLeadingLetterLabel(content));
    if (!normalizedKey) return -1;

    let best = -1;
    let maxSimilarity = 0;
    options.forEach((opt, optIdx) => {
        const normalizedOpt = normalize(stripLeadingLetterLabel(opt));
        if (!normalizedOpt) return;
        let similarity = 0;
        if (normalizedOpt === normalizedKey) similarity = 1;
        else if (normalizedKey.includes(normalizedOpt) || normalizedOpt.includes(normalizedKey)) {
            similarity = Math.min(normalizedOpt.length, normalizedKey.length) / Math.max(normalizedOpt.length, normalizedKey.length);
        }
        if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            best = optIdx;
        }
    });
    return maxSimilarity > 0.6 ? best : -1;
}

function applyAnswerKeyText(questions: Question[], raw: string): { next: Question[]; count: number } {
    const next = questions.map(q => ({ ...q, options: [...q.options], correctAnswer: [...q.correctAnswer] }));
    const seen = new Set<number>();

    for (const assignment of parseAnswerKey(raw)) {
        const target = next[assignment.qIdx];
        if (!target) continue;

        let slot = assignment.content ? bestOptionIndex(target.options, assignment.content) : -1;
        if (slot < 0) slot = assignment.letterIndex;
        const opt = slot >= 0 ? target.options[slot] : "";
        if (!opt) continue;

        target.correctAnswer = [opt];
        seen.add(assignment.qIdx);
    }

    return { next, count: seen.size };
}

function stripAnswerMarker(raw: string): { text: string; answerIndex?: number } {
    const re = /(?:Đáp án(?:\s+đúng)?|Answer|Ans|ĐA)\s*[:：\-]\s*([a-dA-D1-4])\b/i;
    const m = raw.match(re);
    if (!m || m.index == null) return { text: raw };
    const after = raw.slice(m.index + m[0].length).replace(/<[^>]+>/g, "").trim();
    if (after.length > 12) return { text: raw };
    const text = `${raw.slice(0, m.index)} ${raw.slice(m.index + m[0].length)}`.replace(/\s+/g, " ").trim();
    const answerIndex = answerTokenToIndex(m[1]);
    return answerIndex >= 0 ? { text, answerIndex } : { text: raw };
}

export default function QuizBuilder() {
    const { t, language } = useLanguage();
    const { user, login } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();
    const editId = searchParams.get("edit");

    const [questions, setQuestions] = useState<Question[]>([
        {
            id: "1",
            text: "",
            type: "single",
            options: ["", "", "", ""],
            correctAnswer: [],
            hint: "",
            explanation: "",
        },
    ]);

    const [title, setTitle] = useState(t.builder.untitled);
    const [description, setDescription] = useState("");
    const [subject, setSubject] = useState("");
    const [chapter, setChapter] = useState<number | "">("");
    const [chapterName, setChapterName] = useState("");
    const [shuffleOptions, setShuffleOptions] = useState(false);
    const [imageUrl, setImageUrl] = useState("");
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
    const [originalQuiz, setOriginalQuiz] = useState<QuizData | null>(null);
    const [presences, setPresences] = useState<UserPresence[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showResetFormatInput, setShowResetFormatInput] = useState(false);
    const [resetFormatRangeText, setResetFormatRangeText] = useState("");

    // Load quiz for editing
    useEffect(() => {
        if (editId) {
            getQuizById(editId).then(data => {
                if (data) {
                    setOriginalQuiz(data);
                    setTitle(data.title);
                    setDescription(data.description);
                    setSubject(data.subject || "");
                    setChapter(data.chapter !== undefined && data.chapter !== null ? data.chapter : "");
                    setChapterName(data.chapterName || "");
                    setShuffleOptions(data.shuffleOptions ?? true);
                    setImageUrl(data.imageUrl || "");
                    setQuestions(data.questions.map(q =>
                        q.type === "single" || q.type === "mixed"
                            ? {
                                ...q,
                                options: [...q.options].slice(0, 4).concat(
                                    Array(Math.max(0, 4 - q.options.length)).fill("")
                                ),
                                correctAnswer: q.correctAnswer.length > 0 ? [q.correctAnswer[0]] : [],
                            }
                            : q
                    ));
                    
                    // Scroll to specific question if requested
                    const targetQId = searchParams.get("questionId");
                    if (targetQId) {
                        setTimeout(() => {
                            const el = document.getElementById(`question-${targetQId}`);
                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            // Highlight the question briefly
                            el?.classList.add('ring-2', 'ring-sky-500', 'ring-offset-8', 'rounded-3xl');
                            setTimeout(() => {
                                el?.classList.remove('ring-2', 'ring-sky-500', 'ring-offset-8');
                            }, 3000);
                        }, 500);
                    }
                }
                setIsLoading(false);
            }).catch(() => setIsLoading(false));

            // Presence management
            const unsubscribe = subscribeToQuizPresence(editId, (data) => {
                const now = Date.now();
                setPresences(data.filter(p => {
                    if (p.userId === user?.uid) return false;
                    // Filter stale presence (older than 1 minute)
                    const lastActive = p.lastActive?.toMillis?.() || p.lastActive;
                    return (now - lastActive) < 60000;
                }));
            });

            return () => {
                unsubscribe();
                if (user) removeQuizPresence(editId, user.uid);
            };
        }
    }, [editId, user]);

    const handleFocusQuestion = async (questionId: string | null) => {
        if (editId && user) {
            await updateQuizPresence(editId, user.uid, user.displayName || user.email || "Anonymous", questionId);
        }
    };

    const addQuestion = () => {
        const newQuestion: Question = {
            id: Math.random().toString(36).substr(2, 9),
            text: "",
            type: "single",
            options: ["", "", "", ""],
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

    const ensureFourChoiceOptions = (question: Question): Question => {
        if (question.type !== "single" && question.type !== "mixed") return question;
        const options = [...question.options].slice(0, 4);
        while (options.length < 4) options.push("");
        const correctAnswer = question.correctAnswer.length > 0
            ? [question.correctAnswer[0]]
            : [];
        return { ...question, options, correctAnswer };
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
            options: ["", "", "", ""],
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

    // Hàm xóa toàn bộ HTML tags, chỉ giữ plain text
    const stripHtml = (html: string) => {
        if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '');
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    };

    const resetFormatForQuestion = (q: Question): Question => ({
        ...q,
        text: stripHtml(q.text),
        options: q.options.map(stripHtml),
        correctAnswer: q.correctAnswer.map(stripHtml),
    });

    const resetAllFormat = () => {
        setQuestions(qs => qs.map(resetFormatForQuestion));
        toast.success('Đã reset toàn bộ định dạng chữ!');
        setShowResetFormatInput(false);
    };

    const resetFormatByRange = () => {
        if (!resetFormatRangeText.trim()) return;
        const indices = new Set<number>();
        resetFormatRangeText.split(',').forEach(part => {
            const rangeMatch = part.match(/(\d+)\s*-\s*(\d+)/);
            if (rangeMatch) {
                const start = parseInt(rangeMatch[1]);
                const end = parseInt(rangeMatch[2]);
                for (let i = Math.min(start, end); i <= Math.max(start, end); i++) indices.add(i - 1);
            } else {
                const num = parseInt(part.trim());
                if (!isNaN(num)) indices.add(num - 1);
            }
        });
        setQuestions(qs => qs.map((q, idx) => indices.has(idx) ? resetFormatForQuestion(q) : q));
        toast.success(`Đã reset định dạng ${indices.size} câu hỏi!`);
        setResetFormatRangeText('');
        setShowResetFormatInput(false);
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

        const applyLetterSlot = (targetQ: Question, letterIndex: number) => {
            const opt = targetQ.options[letterIndex];
            if (!opt) return false;
            targetQ.correctAnswer = [opt];
            return true;
        };

        lines.forEach((line, index) => {
            // 1A / 1.A / 1: B / 1) C. nội dung → bỏ nhãn A–D, gán vào lựa chọn 1–4
            const numberedLetter = line.match(/^(\d+)\s*[\.\:\-\)]?\s*([a-dA-D1-4])\b[\.\:\-\)\s]*(.*)$/i);
            const rawLabelMatch = line.match(/^([a-dA-D])[\.\:\-\)\s]*(.*)/i);
            const numberedContent = line.match(/^(\d+)[\.\:\-\)\s]+(.*)/i);

            let qIdx = index;
            let contentToMatch = line;
            let letterIndex = -1;

            if (numberedLetter) {
                qIdx = parseInt(numberedLetter[1], 10) - 1;
                letterIndex = answerTokenToIndex(numberedLetter[2]);
                contentToMatch = numberedLetter[3].trim();
            } else if (numberedContent) {
                qIdx = parseInt(numberedContent[1], 10) - 1;
                contentToMatch = numberedContent[2];
                const embedded = contentToMatch.match(/^([a-dA-D])[\.\:\-\)\s]+(.*)$/i);
                if (embedded) {
                    letterIndex = answerTokenToIndex(embedded[1]);
                    contentToMatch = embedded[2].trim();
                }
            } else if (rawLabelMatch) {
                letterIndex = answerTokenToIndex(rawLabelMatch[1]);
                contentToMatch = rawLabelMatch[2].trim();
            }

            const targetQ = newQuestions[qIdx];
            if (!targetQ) return;

            if (!contentToMatch) {
                if (letterIndex >= 0 && applyLetterSlot(targetQ, letterIndex)) count++;
                return;
            }

            const normalizedKey = normalize(stripLeadingLetterLabel(contentToMatch));
            if (!normalizedKey) {
                if (letterIndex >= 0 && applyLetterSlot(targetQ, letterIndex)) count++;
                return;
            }

            let bestMatchIdx = -1;
            let maxSimilarity = 0;

            targetQ.options.forEach((opt, optIdx) => {
                const normalizedOpt = normalize(stripLeadingLetterLabel(opt));
                if (!normalizedOpt) return;

                let similarity = 0;
                if (normalizedOpt === normalizedKey) {
                    similarity = 1.0;
                } else if (normalizedKey.includes(normalizedOpt) || normalizedOpt.includes(normalizedKey)) {
                    similarity = Math.min(normalizedOpt.length, normalizedKey.length) / Math.max(normalizedOpt.length, normalizedKey.length);
                }

                if (similarity > maxSimilarity) {
                    maxSimilarity = similarity;
                    bestMatchIdx = optIdx;
                }
            });

            if (maxSimilarity > 0.6) {
                targetQ.correctAnswer = [targetQ.options[bestMatchIdx]];
                count++;
            } else if (letterIndex >= 0 && applyLetterSlot(targetQ, letterIndex)) {
                count++;
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
        const finalized: Question = {
            id: q.id!,
            text: q.text?.trim() || "",
            type: (q.correctAnswer?.length || 0) > 1 ? "multiple" : (q.type as any || "single"),
            options: q.options?.length ? q.options : ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],
            correctAnswer: q.correctAnswer?.slice(0, 1) || [],
            hint: q.hint || "",
            explanation: q.explanation || ""
        };
        if (finalized.type === "single" || finalized.type === "mixed") {
            finalized.options = [...finalized.options].slice(0, 4);
            while (finalized.options.length < 4) finalized.options.push("");
        }
        return finalized;
    }

    const parseTextToQuestions = (text: string) => {
        const lines = text.split('\n').map(l => l.trim());
        const newQuestions: Question[] = [];
        const draft: { current: DraftQuestion | null } = { current: null };

        const isSequentialNumberedChoice = (num: number) => {
            const currentQ = draft.current;
            if (!currentQ || currentQ.optionStyle === "letter") return false;
            if (num < 1 || num > 4) return false;
            const count = currentQ.options?.length || 0;
            if (count === 0) return num === 1;
            return num === count + 1;
        };

        const rememberAnswer = (answerIndex: number) => {
            const currentQ = draft.current;
            if (!currentQ || answerIndex < 0) return;
            const opt = currentQ.options?.[answerIndex];
            if (opt) currentQ.correctAnswer = [opt];
            else currentQ.pendingAnswerIndex = answerIndex;
        };

        const pushCurrent = () => {
            const currentQ = draft.current;
            if (!currentQ) return;
            if ((currentQ.correctAnswer?.length || 0) === 0 && currentQ.pendingAnswerIndex != null) {
                const opt = currentQ.options?.[currentQ.pendingAnswerIndex];
                if (opt) currentQ.correctAnswer = [opt];
            }
            newQuestions.push(finalizeQuestion(currentQ));
            draft.current = null;
        };

        // Giai đoạn 1: Tách câu hỏi và lựa chọn
        for (let i = 0; i < lines.length; i++) {
            const originalLine = lines[i];
            if (!originalLine) continue;

            // Phát hiện marker đáp án đúng: gạch chân (từ HTML) hoặc marker tùy chỉnh
            const isHighlighted = originalLine.includes('<mark>');
            const isUnderlined = originalLine.includes('<u>') || originalLine.includes('<ins>') || originalLine.includes('__u__');
            const isBold = originalLine.includes('<b>') || originalLine.includes('<strong>') || originalLine.includes('__b__');

            // Làm sạch dòng để so khớp (xóa tag gạch chân, in đậm và highlight)
            const line = originalLine
                .replace(/<\/?(u|ins|b|strong|mark)\b[^>]*>/g, "")
                .replace(/__u__|__b__/g, "")
                .trim();

            // Bảng đáp án ("Đáp án", "Đáp án: 1A 2B"). "Đáp án: B" vẫn là đáp án của câu hiện tại.
            const keyHeader = line.match(/^(?:Bảng đáp án|Answer Key|Answers|Key|Đáp án)\s*[:\-]?\s*(.*)$/i);
            if (keyHeader) {
                const rest = keyHeader[1].trim();
                const isTable = !rest || /(\d+)\s*[\.\:\-\)]?\s*[a-dA-D]\b/i.test(rest);
                if (isTable) {
                    pushCurrent();
                    break;
                }
            }

            const explicitQuestionMatch = line.match(/^(?:Câu|Question|Q)\s*(\d+)[\.\:\/\-)]\s*(.*)/i);
            const letterOptionMatch = line.match(/^[\*\(\[]?([a-dA-D])[\.\:\/\-\)\]\*]{1,3}\s*(.*)/i);
            const numberedChoiceMatch = line.match(/^[\*\(\[]?([1-4])[\.\:\/\-\)\]\*]{1,3}\s*(.*)/i);
            const implicitQuestionMatch = line.match(/^(\d+)[\.\:\/\-)]\s*(.*)/i);
            const answerLineMatch = line.match(/^(?:Đáp án(?:\s+đúng)?|Answer|Ans|ĐA)\s*[:\-]?\s*([a-dA-D1-4])\b/i);

            const startQuestion = (rawText: string) => {
                pushCurrent();
                const pulled = stripAnswerMarker(rawText);
                draft.current = {
                    id: Math.random().toString(36).substr(2, 9),
                    text: pulled.text,
                    type: "single",
                    options: [],
                    correctAnswer: [],
                    hint: "",
                    explanation: "",
                    pendingAnswerIndex: pulled.answerIndex
                };
            };

            const currentQ = draft.current;
            const questionMatch = explicitQuestionMatch || (
                !(letterOptionMatch && currentQ) &&
                !(numberedChoiceMatch && isSequentialNumberedChoice(parseInt(numberedChoiceMatch?.[1] || "0", 10))) &&
                implicitQuestionMatch
            );

            if (questionMatch) {
                startQuestion(originalLine.trim());
            } else if (currentQ && (letterOptionMatch || (numberedChoiceMatch && isSequentialNumberedChoice(parseInt(numberedChoiceMatch[1], 10))))) {
                const optionMatch = letterOptionMatch || numberedChoiceMatch!;
                const isNumbered = !letterOptionMatch;
                currentQ.optionStyle = isNumbered ? "number" : "letter";

                const isInlineCorrect = line.startsWith('*') ||
                    line.includes('**') ||
                    (line.startsWith('[') && line.includes(']')) ||
                    isUnderlined || isBold || isHighlighted;

                const bodyStart = originalLine.indexOf(optionMatch[2]);
                let formattedOpt = bodyStart >= 0 ? originalLine.substring(bodyStart) : optionMatch[2];
                if (isNumbered) formattedOpt = stripLeadingLetterLabel(formattedOpt);

                currentQ.options?.push(formattedOpt);
                if (isInlineCorrect) {
                    if (!currentQ.correctAnswer) currentQ.correctAnswer = [];
                    if (!currentQ.correctAnswer.includes(formattedOpt)) {
                        currentQ.correctAnswer.push(formattedOpt);
                    }
                    currentQ.pendingAnswerIndex = undefined;
                }
            } else if (currentQ && answerLineMatch) {
                rememberAnswer(answerTokenToIndex(answerLineMatch[1]));
            } else if (currentQ) {
                const pulled = stripAnswerMarker(line);
                currentQ.text += "\n" + pulled.text;
                if (pulled.answerIndex != null) rememberAnswer(pulled.answerIndex);
            }
        }
        pushCurrent();

        // Giai đoạn 2: Tìm bảng đáp án ở cuối (nếu có)
        // Tìm đoạn text bắt đầu bằng "Đáp án", "Bảng đáp án", "Answer Key"
        const answerKeyIndex = lines.findIndex(l => {
            const plain = l
                .replace(/<\/?(?:u|ins|b|strong|mark)\b[^>]*>/g, "")
                .replace(/__u__|__b__/g, "")
                .trim();
            const header = plain.match(/^(?:Bảng đáp án|Answer Key|Answers|Key|Đáp án)\s*[:\-]?\s*(.*)$/i);
            if (!header) return false;
            const rest = header[1].trim();
            return !rest || /(\d+)\s*[\.\:\-\)]?\s*[a-dA-D]\b/i.test(rest);
        });
        if (answerKeyIndex !== -1) {
            const headerPlain = lines[answerKeyIndex]
                .replace(/<\/?(?:u|ins|b|strong|mark)\b[^>]*>/g, "")
                .replace(/__u__|__b__/g, "")
                .trim();
            const inlineKey = headerPlain.replace(/^(?:Bảng đáp án|Answer Key|Answers|Key|Đáp án)\s*[:\-]?\s*/i, "");
            const answerKeyLines = [inlineKey, ...lines.slice(answerKeyIndex + 1)].filter(l => l.trim());
            answerKeyLines.forEach(line => {
                // Khớp định dạng: "1.A", "2: B", "3-C", "4) D", "5A", "6 B"
                const matches = line.matchAll(/(\d+)[\.\:\-\)\s]*([a-dA-D])\b/gi);
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

            // Sử dụng convertToHtml để giữ lại định dạng như gạch chân
            const result = await mammoth.convertToHtml(
                { arrayBuffer },
                {
                    styleMap: [
                        "u => u",
                        "strike => s",
                        "b => b",
                        "highlight => mark"
                    ]
                }
            );

            // Chuyển đổi HTML thành định dạng văn bản theo dòng mà parseTextToQuestions mong đợi
            let text = result.value
                .replace(/<\/p>/g, "\n")
                .replace(/<p[^>]*>/g, "")
                .replace(/<br\s*\/?>/g, "\n")
                // Giữ lại tag <u>, <ins>, <b>, <strong>, <mark>, loại bỏ các tag HTML khác
                .replace(/<(?!(\/)?(u|ins|b|strong|mark)\b)[^>]+>/g, "");

            const newQuestions = parseTextToQuestions(text);

            if (newQuestions.length > 0) {
                setQuestions(prev => [...prev.filter(q => q.text !== ""), ...newQuestions]);
                toast.success(t.builder.alerts.importSuccess.replace('{count}', String(newQuestions.length)), { id: toastId });
            } else {
                toast.error(t.builder.alerts.importError, { id: toastId });
            }
        } catch (error) {
            console.error("Failed to parse DOCX", error);
            toast.error(t.builder.alerts.docxError, { id: toastId });
        } finally {
            setIsImporting(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleSave = async () => {
        if (!user) {
            toast.error(t.builder.alerts.loginReq);
            login();
            return;
        }

        if (!title.trim()) {
            toast.warning(t.builder.alerts.noTitle);
            return;
        }

        const toastId = toast.loading(editId ? t.builder.alerts.updateProgress : t.builder.alerts.saveProgress);
        setIsSaving(true);
        let savedQuizId = editId;
        try {
            const normalizedQuestions = questions.map(q =>
                q.type === "single" || q.type === "mixed"
                    ? ensureFourChoiceOptions(q)
                    : q
            );
            setQuestions(normalizedQuestions);
            const quizData: Partial<QuizData> = {
                title,
                description,
                subject,
                chapter: chapter === "" ? undefined : Number(chapter),
                chapterName: chapterName.trim() || undefined,
                shuffleOptions,
                imageUrl: imageUrl.trim() || undefined,
                questions: normalizedQuestions,
            };

            if (editId) {
                // If editing, make sure current user is owner or collaborator
                if (originalQuiz &&
                    originalQuiz.userId !== user.uid &&
                    !originalQuiz.collaborators?.includes(user.email || "")) {
                    toast.error(t.builder.alerts.permissionDenied);
                    setIsSaving(false);
                    return;
                }

                await updateQuiz(editId, quizData);
                toast.success(t.builder.alerts.updateSuccess, { id: toastId });
            } else {
                const newQuizData: QuizData = {
                    ...quizData as QuizData,
                    userId: user.uid,
                    authorName: user.displayName || (language === 'vi' ? "Ẩn danh" : "Anonymous"),
                    authorEmail: user.email || undefined,
                    collaborators: []
                };
                savedQuizId = await saveQuizToFirestore(newQuizData);
                toast.success(t.builder.alerts.saveSuccess, { id: toastId });
                router.push("/my-courses");
            }

            // Create notification for missing answers
            const missingIdx = normalizedQuestions.map((q, i) => q.correctAnswer.length === 0 ? i + 1 : null).filter(n => n !== null);
            if (missingIdx.length > 0 && savedQuizId) {
                await createNotification({
                    userId: user.uid,
                    type: 'missing_answer',
                    title: t.builder.alerts.missingAnswersTitle,
                    message: t.builder.alerts.missingAnswersMsg.replace('{title}', title).replace('{indices}', missingIdx.join(', ')),
                    link: `/questionbuilder?edit=${savedQuizId}`
                });
            }
        } catch (error: any) {
            console.error("Save error:", error);
            const msg = error.code === 'permission-denied'
                ? t.builder.alerts.permissionDenied
                : error.message || t.common.error;
            toast.error(msg, { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const canEdit = !editId || (user && originalQuiz && (originalQuiz.userId === user.uid || originalQuiz.collaborators?.includes(user.email || "")));

    if (isLoading) return <div className="text-center py-20">{t.common.loading}</div>;

    if (editId && !isLoading && !canEdit) {
        return (
            <div className="max-w-4xl mx-auto py-32 text-center space-y-6">
                <div className="inline-flex p-4 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full">
                    <X className="h-10 w-10" />
                </div>
                <h1 className="text-3xl font-black">{t.builder.tools.noPermissionTitle}</h1>
                <p className="text-zinc-500 max-w-md mx-auto">
                    {t.builder.tools.noPermissionDesc}
                </p>
                <Button onClick={() => router.push("/my-courses")}>{t.builder.tools.backToMyCourses}</Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20 pt-10">
            {/* Consolidated Sticky Action Bar */}
            <div className="sticky top-24 z-40 -mx-4 px-4 py-2 pointer-events-none">
                <div className="max-w-4xl mx-auto flex items-center justify-between pointer-events-auto bg-white/70 dark:bg-zinc-900/80 backdrop-blur-xl p-2 md:p-3 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/20 dark:border-white/5">
                    <div className="flex items-center gap-2 md:gap-3 pl-2">
                        <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-10 w-10 p-0 rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-90">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="hidden md:block overflow-hidden">
                            <h2 className="font-black text-sm text-zinc-900 dark:text-zinc-100 truncate max-w-[200px]">
                                {title || t.builder.untitled}
                            </h2>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                                {editId ? (language === 'vi' ? 'Đang chỉnh sửa' : 'Editing') : (language === 'vi' ? 'Tạo mới' : 'New Quiz')}
                            </p>
                        </div>
                    </div>

                    {/* Jump to Empty (Integrated & Animated) */}
                    <AnimatePresence>
                        {questions.some(q => q.correctAnswer.length === 0) && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                                className="absolute left-1/2 -translate-x-1/2"
                            >
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        const firstEmptyIdx = questions.findIndex(q => q.correctAnswer.length === 0);
                                        const el = document.getElementById(`question-${questions[firstEmptyIdx].id}`);
                                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }}
                                    className="rounded-full bg-amber-500/10 hover:bg-amber-500 text-amber-600 hover:text-white border border-amber-500/20 gap-1.5 h-8 md:h-9 px-3 md:px-4 text-[9px] md:text-xs font-black transition-all hover:shadow-lg hover:shadow-amber-500/20 active:scale-95"
                                >
                                    <Zap className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                    <span className="hidden sm:inline">{t.builder.tools.jumpToEmpty}</span>
                                    <span className="sm:hidden">{questions.filter(q => q.correctAnswer.length === 0).length}</span>
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex items-center gap-2 pr-1 ml-auto">
                        <div className="hidden lg:flex flex-col items-end mr-2 pr-2 border-r border-zinc-200 dark:border-white/5">
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 leading-none">Total</span>
                            <span className="text-sm font-black text-zinc-900 dark:text-white">{questions.length}</span>
                        </div>
                        <Button
                            variant="ghost"
                            className="rounded-full h-9 md:h-10 px-3 md:px-4 text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                            disabled={isSaving}
                            onClick={() => router.back()}
                        >
                            {t.builder.cancel}
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="rounded-full px-4 md:px-6 h-10 md:h-11 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black text-xs md:text-sm border-0 hover:opacity-90 min-w-[80px] md:min-w-[140px] shadow-xl transition-all hover:scale-[1.02] active:scale-95"
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <div className="h-4 w-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin sm:mr-2" />
                            ) : (
                                <Save className="sm:mr-2 h-4 w-4" />
                            )}
                            <span className="hidden sm:inline">
                                {isSaving
                                    ? (editId ? t.builder.alerts.updateProgress : t.builder.alerts.saveProgress)
                                    : (editId ? (language === 'vi' ? 'Cập nhật' : 'Update') : t.builder.save)
                                }
                            </span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Quiz Header Info */}
            <div className="space-y-4 text-center mt-8 px-4">
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onFocus={() => handleFocusQuestion(null)}
                    className="w-full text-center text-2xl md:text-5xl font-black bg-transparent border-none focus:outline-none placeholder-zinc-300 dark:placeholder-zinc-700 text-zinc-900 dark:text-white transition-all tracking-tight"
                    placeholder={t.builder.untitled}
                />
                <div className="flex flex-col gap-3 max-w-2xl mx-auto bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-3xl border border-zinc-200/50 dark:border-white/5 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                        <div className="relative w-full sm:flex-[1.5]">
                            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sky-400" />
                            <Input
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                onFocus={() => handleFocusQuestion(null)}
                                className="pl-10 h-10 rounded-2xl bg-white dark:bg-zinc-800/80 border-sky-100 dark:border-sky-900/30 focus:ring-sky-500 text-sm font-bold"
                                placeholder={language === 'vi' ? "Tên môn học/Nhóm..." : "Subject/Group name..."}
                            />
                        </div>
                        <div className="relative w-full sm:w-[100px] shrink-0">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-sky-400">#</span>
                            <Input
                                type="number"
                                value={chapter}
                                onChange={(e) => setChapter(e.target.value === "" ? "" : Number(e.target.value))}
                                onFocus={() => handleFocusQuestion(null)}
                                className="pl-8 h-10 rounded-2xl bg-white dark:bg-zinc-800/80 border-sky-100 dark:border-sky-900/30 focus:ring-sky-500 text-sm font-bold text-center"
                                placeholder={language === 'vi' ? "Chương..." : "Chap..."}
                                min={1}
                            />
                        </div>
                        <div className="relative w-full sm:flex-[2]">
                            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sky-400" />
                            <Input
                                value={chapterName}
                                onChange={(e) => setChapterName(e.target.value)}
                                onFocus={() => handleFocusQuestion(null)}
                                className="pl-10 h-10 rounded-2xl bg-white dark:bg-zinc-800/80 border-sky-100 dark:border-sky-900/30 focus:ring-sky-500 text-sm font-bold"
                                placeholder={language === 'vi' ? "Tên chương (ví dụ: Hàm số)..." : "Chapter name..."}
                            />
                        </div>
                    </div>
                    <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onFocus={() => handleFocusQuestion(null)}
                        className="w-full text-center sm:text-left border-none resize-none shadow-none text-zinc-400 font-medium bg-transparent focus:ring-0 text-sm min-h-[40px] py-1 px-3"
                        placeholder={t.builder.descPlaceholder}
                        rows={1}
                    />
                    <div className="flex items-center gap-2">
  <Input
    value={imageUrl}
    onChange={(e) => setImageUrl(e.target.value)}
    className="flex-1 text-center sm:text-left rounded-2xl bg-white dark:bg-zinc-800/80 border-sky-100 dark:border-sky-900/30 focus:ring-sky-500 text-sm font-medium"
    placeholder={language === 'vi' ? "URL ảnh bìa (tuỳ chọn)..." : "Cover image URL (optional)..."}
  />
  <label htmlFor="coverImageUpload" className="cursor-pointer">
    <Upload className="h-5 w-5 text-sky-600" />
    <input
      id="coverImageUpload"
      type="file"
      accept="image/*"
      className="hidden"
      onChange={async (e) => {
        const file = e.target.files?.[0];
        if (file) {
          try {
            const url = await uploadImageToCloudinary(file);
            setImageUrl(url);
            toast.success(language === 'vi' ? 'Tải ảnh lên thành công!' : 'Image uploaded successfully!');
          } catch (err) {
            console.error(err);
            toast.error(language === 'vi' ? 'Lỗi tải ảnh lên' : 'Upload failed');
          }
        }
      }}
    />
  </label>
</div>
                    <div className="flex items-center gap-2 px-3 pt-2">
                        <input
                            type="checkbox"
                            id="shuffleOptions"
                            checked={shuffleOptions}
                            onChange={(e) => setShuffleOptions(e.target.checked)}
                            className="w-4 h-4 text-sky-600 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                        />
                        <label htmlFor="shuffleOptions" className="text-sm font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                            {language === 'vi' ? 'Xáo trộn đáp án (khi luyện tập/thi)' : 'Shuffle options (during practice/exam)'}
                        </label>
                    </div>
                </div>
            </div>

            {/* Toolbar - Optimized for Responsive */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-3xl border border-zinc-200/50 dark:border-white/5 mx-4">
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2 rounded-full h-10 px-4"
                        onClick={() => setShowDeleteAllDialog(true)}
                    >
                        <Trash2 className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-wide">{t.builder.tools.deleteAll}</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-zinc-500 hover:bg-zinc-100 gap-2 rounded-full h-10 px-4"
                        onClick={() => setShowRangeDeleteInput(!showRangeDeleteInput)}
                    >
                        <Eraser className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-wide">{t.builder.tools.deleteRange}</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-violet-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 gap-2 rounded-full h-10 px-4"
                        onClick={() => setShowResetFormatInput(!showResetFormatInput)}
                    >
                        <RotateCcw className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-wide">{language === 'vi' ? 'Reset định dạng' : 'Reset Format'}</span>
                    </Button>
                    <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-full px-3 h-10 ml-2">
                        <span className="text-xs font-bold text-zinc-500 uppercase hidden sm:block">{language === 'vi' ? 'Câu hỏi:' : 'Question:'}</span>
                        <Button 
                            variant="ghost" size="sm" 
                            className="h-7 w-8 p-0 text-zinc-600 hover:text-zinc-900 font-bold" 
                            onClick={() => setQuestions(qs => qs.map(q => ({ ...q, fontSize: Math.max(12, (q.fontSize || 16) - 2) })))}
                            title="Giảm cỡ chữ tất cả câu hỏi"
                        >A-</Button>
                        <Button 
                            variant="ghost" size="sm" 
                            className="h-7 w-8 p-0 text-zinc-600 hover:text-zinc-900 font-bold" 
                            onClick={() => setQuestions(qs => qs.map(q => ({ ...q, fontSize: Math.min(48, (q.fontSize || 16) + 2) })))}
                            title="Tăng cỡ chữ tất cả câu hỏi"
                        >A+</Button>
                        <div className="w-px h-5 bg-zinc-300 dark:bg-zinc-600 mx-1" />
                        <span className="text-xs font-bold text-emerald-600 uppercase hidden sm:block">{language === 'vi' ? 'Đáp án:' : 'Answer:'}</span>
                        <Button 
                            variant="ghost" size="sm" 
                            className="h-7 w-8 p-0 text-emerald-600 hover:text-emerald-900 font-bold" 
                            onClick={() => setQuestions(qs => qs.map(q => ({ ...q, answerFontSize: Math.max(12, (q.answerFontSize || 14) - 2) })))}
                            title="Giảm cỡ chữ đáp án tất cả"
                        >A-</Button>
                        <Button 
                            variant="ghost" size="sm" 
                            className="h-7 w-8 p-0 text-emerald-600 hover:text-emerald-900 font-bold" 
                            onClick={() => setQuestions(qs => qs.map(q => ({ ...q, answerFontSize: Math.min(48, (q.answerFontSize || 14) + 2) })))}
                            title="Tăng cỡ chữ đáp án tất cả"
                        >A+</Button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-center md:justify-end">
                    <Button
                        variant="outline"
                        className="gap-2 border-sky-500/20 hover:bg-sky-50 dark:hover:bg-sky-950/30 rounded-full h-10 px-4 text-xs font-bold"
                        onClick={() => setShowQuickPaste(!showQuickPaste)}
                    >
                        <ClipboardList className="h-4 w-4 text-sky-500" />
                        {showQuickPaste ? t.builder.tools.quickPasteHide : t.builder.tools.quickPaste}
                    </Button>
                    <Button
                        variant="outline"
                        className="gap-2 border-emerald-500/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-full h-10 px-4 text-xs font-bold"
                        onClick={() => setShowAnswerKeyPaste(!showAnswerKeyPaste)}
                    >
                        <Sparkles className="h-4 w-4 text-emerald-500" />
                        {showAnswerKeyPaste ? t.builder.tools.answerKeyHide : t.builder.tools.answerKey}
                    </Button>
                    <div className="relative">
                        <input
                            type="file"
                            accept=".docx"
                            onChange={handleFileUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Button variant="outline" className="gap-2 border-zinc-200/50 rounded-full h-10 px-4 text-xs font-bold bg-white dark:bg-zinc-800 shadow-sm">
                            <FileUp className="h-4 w-4 text-zinc-500" />
                            {isImporting ? t.builder.importing : t.builder.importBtn}
                        </Button>
                    </div>
                </div>

                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                        placeholder={language === 'vi' ? "Tìm kiếm câu hỏi..." : "Search questions..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-10 rounded-full bg-white dark:bg-zinc-800 border-zinc-200/50 dark:border-white/5 focus:ring-sky-500/20 transition-all text-xs font-medium"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Range Delete Input */}
            {showRangeDeleteInput && (
                <Card className="bg-red-50/30 dark:bg-red-950/10 border-red-500/20 animation-scale-in">
                    <CardContent className="pt-6 flex gap-4 items-end">
                        <div className="flex-1 space-y-2">
                            <label className="text-xs font-bold uppercase text-red-600">{t.builder.tools.deleteRangeLabel}</label>
                            <Input
                                placeholder={t.builder.tools.deleteRangePlaceholder}
                                value={deleteRangeText}
                                onChange={(e) => setDeleteRangeText(e.target.value)}
                                className="bg-white dark:bg-black/20"
                            />
                        </div>
                        <Button variant="destructive" onClick={deleteByRange} disabled={!deleteRangeText.trim()}>
                            {t.builder.tools.deleteBtn}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Reset Format Panel */}
            {showResetFormatInput && (
                <Card className="bg-violet-50/30 dark:bg-violet-950/10 border-violet-500/20 animation-scale-in">
                    <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold flex items-center gap-2 text-violet-700 dark:text-violet-400">
                                <RotateCcw className="h-4 w-4" />
                                {language === 'vi' ? 'Reset định dạng chữ' : 'Reset Text Formatting'}
                            </h3>
                            <span className="text-xs text-zinc-400">
                                {language === 'vi' ? 'Xóa toàn bộ bold, highlight, italic khỏi nội dung' : 'Strips bold, highlight, italic from content'}
                            </span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 space-y-2">
                                <label className="text-xs font-bold uppercase text-violet-600">
                                    {language === 'vi' ? 'Theo số câu (ví dụ: 1-5, 8, 10)' : 'By question numbers (e.g. 1-5, 8, 10)'}
                                </label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder={language === 'vi' ? 'VD: 1-3, 5, 8' : 'e.g. 1-3, 5, 8'}
                                        value={resetFormatRangeText}
                                        onChange={(e) => setResetFormatRangeText(e.target.value)}
                                        className="bg-white dark:bg-black/20"
                                    />
                                    <Button
                                        variant="outline"
                                        className="border-violet-400 text-violet-600 hover:bg-violet-50 shrink-0"
                                        onClick={resetFormatByRange}
                                        disabled={!resetFormatRangeText.trim()}
                                    >
                                        <RotateCcw className="h-4 w-4 mr-1" />
                                        {language === 'vi' ? 'Reset theo câu' : 'Reset Range'}
                                    </Button>
                                </div>
                            </div>
                            <div className="flex items-end">
                                <Button
                                    className="bg-violet-600 hover:bg-violet-700 text-white gap-2 w-full sm:w-auto"
                                    onClick={resetAllFormat}
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    {language === 'vi' ? 'Reset toàn bộ' : 'Reset All'}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Quick Answer Key Paste Area */}
            {showAnswerKeyPaste && (
                <Card className="bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-500/20 animation-scale-in">
                    <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-emerald-500" /> {t.builder.tools.answerKey}
                            </h3>
                            <span className="text-xs text-[rgb(var(--muted-foreground))]">
                                {t.builder.tools.answerKeyHelp}
                            </span>
                        </div>
                        <Textarea
                            className="min-h-[100px] font-mono text-sm bg-white dark:bg-black/20"
                            placeholder={t.builder.tools.answerKeyPlaceholder}
                            value={answerKeyPaste}
                            onChange={(e) => setAnswerKeyPaste(e.target.value)}
                        />
                        <div className="flex justify-end">
                            <Button onClick={handleApplyAnswerKey} disabled={!answerKeyPaste.trim()} className="rounded-full px-8 bg-emerald-600 hover:bg-emerald-700 text-white border-0">
                                {t.builder.tools.applyAnswerBtn}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Quick Paste Area */}
            {showQuickPaste && (
                <Card className="bg-sky-50/30 dark:bg-sky-950/10 border-sky-500/20 animation-scale-in">
                    <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-sky-500" /> {t.builder.tools.quickPaste}
                            </h3>
                            <span className="text-xs text-[rgb(var(--muted-foreground))]">
                                {t.builder.tools.quickPasteHelp}
                            </span>
                        </div>
                        <Textarea
                            className="min-h-[200px] font-mono text-sm bg-white dark:bg-black/20"
                            placeholder={t.builder.tools.quickPastePlaceholder}
                            value={quickPaste}
                            onChange={(e) => setQuickPaste(e.target.value)}
                        />
                        <div className="flex justify-end">
                            <Button onClick={handleQuickPaste} disabled={!quickPaste.trim()} className="rounded-full px-8">
                                {t.builder.tools.applyBtn}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6">
                {questions
                    .map((q, idx) => ({ q, idx }))
                    .filter(({ q }) => 
                        q.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        q.options.some(opt => opt.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                    .map(({ q, idx }) => (
                        <div id={`question-${q.id}`} key={q.id}>
                            <QuestionCard
                                index={idx}
                                question={q}
                                activeEditors={presences.filter(p => p.editingQuestionId === q.id)}
                                onUpdate={updateQuestion}
                                onDelete={deleteQuestion}
                                onDuplicate={duplicateQuestion}
                                onFocus={handleFocusQuestion}
                            />
                        </div>
                    ))}
                {searchQuery && questions.filter(q => 
                    q.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    q.options.some(opt => opt.toLowerCase().includes(searchQuery.toLowerCase()))
                ).length === 0 && (
                    <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/30 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-white/5">
                        <Search className="h-10 w-10 mx-auto mb-4 text-zinc-300" />
                        <p className="text-zinc-500 font-bold">{language === 'vi' ? 'Không tìm thấy câu hỏi nào khớp với từ khóa' : 'No questions match your search'}</p>
                        <Button variant="ghost" onClick={() => setSearchQuery("")} className="text-sky-500 mt-2 hover:bg-sky-50">
                            {language === 'vi' ? 'Xóa tìm kiếm' : 'Clear search'}
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center gap-4 mt-8">
                <Button onClick={addQuestion} size="lg" className="w-full md:w-auto px-8 rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                    <Plus className="mr-2 h-5 w-5" /> {t.builder.addQuestion}
                </Button>
            </div>

            <ConfirmDialog
                isOpen={showDeleteAllDialog}
                title={t.builder.dialogs.deleteAllTitle}
                description={t.builder.dialogs.deleteAllDesc}
                confirmText={t.builder.dialogs.deleteConfirm}
                cancelText={t.builder.cancel}
                variant="danger"
                onConfirm={deleteAllQuestions}
                onCancel={() => setShowDeleteAllDialog(false)}
            />
        </div>
    );
}
