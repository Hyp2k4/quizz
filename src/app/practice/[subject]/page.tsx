"use client";

import { useEffect, useState, use, useRef, Suspense } from "react";
import {
    getAllSubjectQuestions,
    getQuizzesBySubject,
    createNotification,
    getSubjectWrongQuestions,
    syncSubjectWrongQuestions
} from "@/services/quizService";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

import {
    Trophy, CheckCircle, XCircle, AlertCircle, PlayCircle,
    BookOpen, LogIn, ArrowRight, Home, LayoutGrid, Zap, Check
} from "lucide-react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { Character, Expression } from "@/components/character/Character";

// Helper to compare arrays
const arraysEqual = (a: any[], b: any[]) => {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, index) => val === sortedB[index]);
};

function PracticeQuestion({
    question,
    index,
    selected,
    onChange,
    isRevealed = false,
    onReveal,
    language = 'vi'
}: any) {
    const isMultiple = question.type === 'multiple';
    const isOpen = question.type === 'open';

    const handleMultiChange = (opt: string, checked: boolean) => {
        if (isRevealed) return;
        const current = Array.isArray(selected) ? selected : [];
        if (checked) {
            onChange([...current, opt]);
        } else {
            onChange(current.filter(i => i !== opt));
        }
    };

    const isCorrect = isRevealed ? (
        isMultiple
            ? arraysEqual(selected, question.correctAnswer)
            : isOpen
                ? (selected || "").trim().toLowerCase() === (question.correctAnswer?.[0] || "").trim().toLowerCase()
                : (question.correctAnswer || []).includes(selected)
    ) : undefined;

    return (
        <Card className={`mb-6 border-l-4 transition-all duration-300 ${isRevealed ? (isCorrect ? 'border-l-green-500 bg-green-50/5' : 'border-l-red-500 bg-red-50/5') : 'border-l-sky-500'}`}>
            <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm ${isRevealed ? (isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') : 'bg-sky-100 text-sky-700'}`}>
                        {isRevealed ? (isCorrect ? <CheckCircle className="h-6 w-6" /> : <XCircle className="h-6 w-6" />) : index + 1}
                    </div>
                    <div className="w-full">
                        <h3 className="font-semibold text-lg mb-4 text-zinc-800 dark:text-zinc-100">{question.text}</h3>

                        {question.imageUrl && (
                            <div className="mb-6 rounded-2xl overflow-hidden bg-zinc-50 border border-zinc-100 dark:border-zinc-800">
                                <img src={question.imageUrl} alt="Question" className="max-h-[400px] w-auto mx-auto object-contain" />
                            </div>
                        )}

                        <div className="space-y-3">
                            {isOpen ? (
                                <div className="space-y-3">
                                    <textarea
                                        className="w-full p-4 rounded-xl border bg-white dark:bg-black/20 min-h-[120px] outline-none focus:ring-2 ring-sky-500/20 transition-all"
                                        placeholder={language === 'vi' ? "Nhập câu trả lời của bạn..." : "Type your answer..."}
                                        value={selected as string || ''}
                                        onChange={(e) => !isRevealed && onChange(e.target.value)}
                                        disabled={isRevealed}
                                    />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {question.options?.map((opt: string, i: number) => {
                                        const isSelected = isMultiple ? (selected as string[])?.includes(opt) : selected === opt;
                                        const isActuallyCorrect = isRevealed && (isMultiple ? question.correctAnswer?.includes(opt) : question.correctAnswer?.[0] === opt);

                                        let optionClass = `flex items-start gap-3 p-4 rounded-2xl border-2 transition-all ${isRevealed ? 'cursor-default' : 'cursor-pointer hover:bg-sky-50/50 dark:hover:bg-zinc-800/50'}`;

                                        if (isRevealed) {
                                            if (isActuallyCorrect) optionClass += " border-green-500 bg-green-50 dark:bg-green-900/20";
                                            else if (isSelected) optionClass += " border-red-500 bg-red-50 dark:bg-red-900/20";
                                            else optionClass += " border-transparent opacity-60";
                                        } else if (isSelected) {
                                            optionClass += " border-sky-500 bg-sky-50 dark:bg-sky-900/20";
                                        } else {
                                            optionClass += " border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900";
                                        }

                                        return (
                                            <label key={i} className={optionClass}>
                                                <input
                                                    type={isMultiple ? "checkbox" : "radio"}
                                                    checked={!!isSelected}
                                                    onChange={() => !isRevealed && (isMultiple ? handleMultiChange(opt, !isSelected) : onChange(opt))}
                                                    disabled={isRevealed}
                                                    className="mt-1 w-4 h-4 text-sky-600"
                                                />
                                                <span className="text-sm font-medium">{opt}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>



                        {isRevealed && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-6 p-4 rounded-2xl bg-sky-50 dark:bg-sky-900/10 border border-sky-100 dark:border-sky-800"
                            >
                                <div className="flex items-center gap-2 mb-2 text-sky-600 dark:text-sky-400 font-bold text-sm">
                                    <AlertCircle className="h-4 w-4" />
                                    {language === 'vi' ? 'Giải thích & Đáp án' : 'Explanation & Answer'}
                                </div>
                                <div className="text-sm space-y-2">
                                    <p><span className="font-bold">{language === 'vi' ? 'Đáp án đúng' : 'Correct Answer'}:</span> {Array.isArray(question.correctAnswer) ? question.correctAnswer.join(", ") : question.correctAnswer}</p>
                                    {question.explanation && <p className="text-zinc-600 dark:text-zinc-400 italic">"{question.explanation}"</p>}
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function PracticeContent({ params }: { params: Promise<{ subject: string }> }) {
    const { subject: rawSubject } = use(params);
    const subject = decodeURIComponent(rawSubject);
    const router = useRouter();
    const searchParams = useSearchParams();
    const mode = searchParams.get('mode');
    const { user, userData, login, refreshUserData } = useAuth();
    const { language } = useLanguage();

    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [selectedQuizzes, setSelectedQuizzes] = useState<Record<string, boolean>>({});
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isStarted, setIsStarted] = useState(false);
    const [answers, setAnswers] = useState<Record<number, any>>({});
    const [revealed, setRevealed] = useState<Record<number, boolean>>({});
    const [score, setScore] = useState(0);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [unansweredCount, setUnansweredCount] = useState(0);

    useEffect(() => {
        async function fetch() {
            setLoading(true);
            try {
                if (mode === 'wrong' && user) {
                    const qs = await getSubjectWrongQuestions(user.uid, subject);
                    setQuestions(qs);
                } else {
                    const subjectQuizzes = await getQuizzesBySubject(subject, undefined, 100);
                    const sortedQuizzes = [...subjectQuizzes].sort((a, b) => {
                        const aVal = a.chapter !== undefined && a.chapter !== null && (a.chapter as any) !== "" ? Number(a.chapter) : Infinity;
                        const bVal = b.chapter !== undefined && b.chapter !== null && (b.chapter as any) !== "" ? Number(b.chapter) : Infinity;
                        if (aVal === bVal) {
                            return (a.title || "").localeCompare(b.title || "");
                        }
                        return aVal - bVal;
                    });
                    setQuizzes(sortedQuizzes);
                    
                    // Default: select all
                    const initialSelected: Record<string, boolean> = {};
                    sortedQuizzes.forEach(q => {
                        if (q.id) initialSelected[q.id] = true;
                    });
                    setSelectedQuizzes(initialSelected);
                }
            } catch (error) {
                console.error("Error fetching subject data:", error);
            } finally {
                setLoading(false);
            }
        }
        if (user || mode !== 'wrong') {
            fetch();
        }
    }, [subject, mode, user]);

    const handleStartPractice = () => {
        const selectedIds = Object.keys(selectedQuizzes).filter(id => selectedQuizzes[id]);
        if (selectedIds.length === 0) {
            toast.error(language === 'vi' ? "Vui lòng chọn ít nhất 1 chương để luyện tập!" : "Please select at least 1 chapter to practice!");
            return;
        }

        let allQuestions: any[] = [];
        quizzes.forEach(quiz => {
            if (quiz.id && selectedQuizzes[quiz.id]) {
                const validQs = (quiz.questions || []).filter((q: any) => 
                    q.type === 'open' || (q.correctAnswer && q.correctAnswer.length > 0)
                );
                allQuestions = [...allQuestions, ...validQs];
            }
        });

        if (allQuestions.length === 0) {
            toast.error(language === 'vi' ? "Các chương được chọn không có câu hỏi hợp lệ!" : "Selected chapters have no valid questions!");
            return;
        }

        // Shuffle questions
        const shuffled = allQuestions.sort(() => Math.random() - 0.5);
        // Take 40 questions (or less if total is less than 40)
        const practiceQuestions = shuffled.slice(0, 40);

        setQuestions(practiceQuestions);
        setIsStarted(true);
    };

    const onPreSubmit = () => {
        const total = questions.length;
        let answered = 0;
        questions.forEach((_, idx) => {
            const ans = answers[idx];
            if (ans !== undefined && (Array.isArray(ans) ? ans.length > 0 : String(ans).trim() !== "")) {
                answered++;
            }
        });
        setUnansweredCount(total - answered);
        setConfirmOpen(true);
    };

    const handleSubmit = async () => {
        let calculatedScore = 0;
        const allRevealed: Record<number, boolean> = {};
        const wrongQs: any[] = [];
        
        questions.forEach((q, idx) => {
            allRevealed[idx] = true;
            const userAns = answers[idx];
            const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer || ""];
            let isCorrect = false;

            if (q.type === 'multiple') isCorrect = arraysEqual(userAns as string[], correctArr);
            else if (q.type === 'single') isCorrect = correctArr.includes(userAns as string);
            else isCorrect = (userAns as string || "").trim().toLowerCase() === (correctArr[0] as string || "").trim().toLowerCase();

            if (isCorrect) {
                calculatedScore++;
            } else {
                wrongQs.push({ question: q, isCorrect: false });
            }
        });

        setScore(calculatedScore);
        setRevealed(allRevealed);
        setIsSubmitted(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (user && subject) {
            const syncData = questions.map((q, idx) => {
                const userAns = answers[idx];
                const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer || ""];
                let isCorrect = false;
                if (q.type === 'multiple') isCorrect = arraysEqual(userAns as string[], correctArr);
                else if (q.type === 'single') isCorrect = correctArr.includes(userAns as string);
                else isCorrect = (userAns as string || "").trim().toLowerCase() === (correctArr[0] as string || "").trim().toLowerCase();
                return { question: q, isCorrect };
            });
            await syncSubjectWrongQuestions(user.uid, subject, syncData);
        }

        if (userData && user) {
            const earnedCoins = Math.round((calculatedScore / questions.length) * 1000);
            if (earnedCoins > 0) {
                try {
                    const { doc, updateDoc, increment } = await import("firebase/firestore");
                    const { db } = await import("@/lib/firebase");
                    const userRef = doc(db, "users", user.uid);
                    await updateDoc(userRef, { snowyCoins: increment(earnedCoins) });
                    if (refreshUserData) await refreshUserData();
                    toast.success(language === 'vi' ? `Hoàn thành! Bạn nhận được ${earnedCoins} Snowy Coins! ❄️` : `Completed! You earned ${earnedCoins} Snowy Coins! ❄️`);
                } catch (err) {
                    console.error("Error adding coins", err);
                }
            }
        }
    };

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-600"></div>
            <p className="text-zinc-500 font-medium animate-pulse">Đang chuẩn bị bộ câu hỏi môn {subject}...</p>
        </div>
    );

    if (!user) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
                <Navbar />
                <main className="flex-1 flex items-center justify-center p-6">
                    <Card className="max-w-md w-full p-10 text-center space-y-8 rounded-[3rem] shadow-2xl border-none">
                        <div className="mx-auto w-24 h-24 bg-sky-50 dark:bg-sky-900/20 text-sky-600 rounded-[2rem] flex items-center justify-center mb-2 shadow-inner transform -rotate-6">
                            <LogIn className="h-12 w-12" />
                        </div>
                        <h2 className="text-3xl font-black">Đăng nhập để luyện tập</h2>
                        <p className="text-zinc-500">Hãy đăng nhập để theo dõi tiến độ luyện tập của bạn.</p>
                        <Button onClick={() => login()} className="w-full h-14 rounded-2xl bg-sky-600 text-lg font-bold shadow-lg shadow-sky-500/20">Đăng nhập ngay</Button>
                    </Card>
                </main>
            </div>
        );
    }

    if (!isStarted) {
        if (mode !== 'wrong') {
            const noQuizzes = quizzes.length === 0;
            const totalSelected = quizzes
                .filter(q => q.id && selectedQuizzes[q.id])
                .reduce((sum, q) => sum + (q.questions?.filter((question: any) => 
                    question.type === 'open' || (question.correctAnswer && question.correctAnswer.length > 0)
                ).length || 0), 0);

            const allSelected = quizzes.length > 0 && quizzes.every(q => q.id && selectedQuizzes[q.id]);
            const selectedCount = Object.values(selectedQuizzes).filter(Boolean).length;

            return (
                <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
                    <Navbar />
                    <main className="pt-32 px-6 max-w-3xl mx-auto pb-20">
                        <Card className="p-8 md:p-10 space-y-8 rounded-[3rem] shadow-2xl border-none bg-white dark:bg-zinc-900/80 backdrop-blur-xl">
                            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left justify-between pb-6 border-b border-zinc-100 dark:border-zinc-800">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-sky-50 dark:bg-sky-900/20 text-sky-600 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                                        <Zap className="h-8 w-8 text-yellow-500" />
                                    </div>
                                    <div>
                                        <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-50">
                                            {language === 'vi' ? `Luyện tập môn ${subject}` : `Practice: ${subject}`}
                                        </h1>
                                        <p className="text-zinc-500 text-sm mt-1">
                                            {language === 'vi' ? 'Chọn chương/bài tập để tạo bộ câu hỏi ngẫu nhiên.' : 'Select chapters/exercises to generate a random question set.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {noQuizzes ? (
                                <div className="text-center py-10 space-y-6">
                                    <div className="mx-auto w-20 h-20 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 rounded-3xl flex items-center justify-center">
                                        <BookOpen className="h-10 w-10" />
                                    </div>
                                    <p className="text-zinc-500 max-w-sm mx-auto">
                                        {language === 'vi'
                                            ? 'Môn học này hiện chưa có chương/bài tập nào để luyện tập.'
                                            : 'This subject does not have any chapters/exercises to practice yet.'}
                                    </p>
                                    <Button onClick={() => router.back()} className="rounded-2xl px-8 h-12 bg-sky-600">
                                        {language === 'vi' ? 'Quay lại' : 'Go Back'}
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                            {language === 'vi' ? `Danh sách chương (${quizzes.length})` : `Chapter List (${quizzes.length})`}
                                        </p>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                if (allSelected) {
                                                    const noneSelected: Record<string, boolean> = {};
                                                    quizzes.forEach(q => { if (q.id) noneSelected[q.id] = false; });
                                                    setSelectedQuizzes(noneSelected);
                                                } else {
                                                    const allSelected: Record<string, boolean> = {};
                                                    quizzes.forEach(q => { if (q.id) allSelected[q.id] = true; });
                                                    setSelectedQuizzes(allSelected);
                                                }
                                            }}
                                            className="text-xs font-bold text-sky-600 hover:text-sky-700 h-8 px-3 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/20"
                                        >
                                            {allSelected 
                                                ? (language === 'vi' ? 'Bỏ chọn tất cả' : 'Deselect All') 
                                                : (language === 'vi' ? 'Chọn tất cả' : 'Select All')}
                                        </Button>
                                    </div>

                                    {/* Chapters Checklist */}
                                    <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                                        {quizzes.map((quiz) => {
                                            const validCount = quiz.questions?.filter((q: any) => 
                                                q.type === 'open' || (q.correctAnswer && q.correctAnswer.length > 0)
                                            ).length || 0;
                                            const isChecked = !!selectedQuizzes[quiz.id!];

                                            return (
                                                <motion.div
                                                    key={quiz.id}
                                                    whileHover={{ scale: 1.01 }}
                                                    onClick={() => {
                                                        setSelectedQuizzes(prev => ({
                                                            ...prev,
                                                            [quiz.id!]: !prev[quiz.id!]
                                                        }));
                                                    }}
                                                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                                                        isChecked
                                                            ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-900/20'
                                                            : 'border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-zinc-200 dark:hover:border-zinc-700'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                                                            isChecked
                                                                ? 'bg-sky-500 border-sky-500 text-white'
                                                                : 'border-zinc-300 dark:border-zinc-700'
                                                        }`}>
                                                            {isChecked && <Check className="w-4 h-4 stroke-[3px]" />}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <BookOpen className="h-4 w-4 text-sky-500 shrink-0" />
                                                            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100 line-clamp-1 flex items-center gap-1">
                                                                {quiz.chapter !== undefined && quiz.chapter !== null && (quiz.chapter as any) !== "" ? (
                                                                    <span className="text-sky-600 dark:text-sky-400 font-extrabold mr-1 shrink-0">
                                                                        [{language === 'vi' ? `Chương ${quiz.chapter}` : `Ch ${quiz.chapter}`}]
                                                                    </span>
                                                                ) : null}
                                                                <span>{quiz.title}</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs font-semibold px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-lg shrink-0">
                                                        {validCount} {language === 'vi' ? 'câu' : 'qs'}
                                                    </span>
                                                </motion.div>
                                            );
                                        })}
                                    </div>

                                    {/* Selection Info Box */}
                                    <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-zinc-500 font-medium">
                                                {language === 'vi' ? 'Đã chọn:' : 'Selected Chapters:'}
                                            </span>
                                            <span className="font-bold text-zinc-800 dark:text-zinc-200">
                                                {selectedCount} / {quizzes.length} {language === 'vi' ? 'chương' : 'chapters'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-zinc-500 font-medium">
                                                {language === 'vi' ? 'Tổng số câu hỏi hiện có:' : 'Available pool:'}
                                            </span>
                                            <span className="font-bold text-zinc-800 dark:text-zinc-200">
                                                {totalSelected} {language === 'vi' ? 'câu hỏi' : 'questions'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
                                            <span className="text-zinc-500 font-bold">
                                                {language === 'vi' ? 'Số câu trong bài luyện tập:' : 'Questions in practice set:'}
                                            </span>
                                            <span className="font-black text-sky-600 dark:text-sky-400 text-base">
                                                {totalSelected > 40 ? '40' : totalSelected} {language === 'vi' ? 'câu ngẫu nhiên' : 'random questions'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Start & Back Buttons */}
                                    <div className="flex flex-col gap-3 pt-2">
                                        <Button
                                            onClick={handleStartPractice}
                                            disabled={selectedCount === 0 || totalSelected === 0}
                                            className="w-full h-16 rounded-3xl bg-sky-600 text-xl font-bold hover:scale-102 transition-all shadow-xl shadow-sky-500/20"
                                        >
                                            {language === 'vi' ? 'Bắt đầu luyện tập' : 'Start Practice'}
                                        </Button>
                                        <Button variant="ghost" onClick={() => router.back()} className="text-zinc-400 hover:text-zinc-600 h-12">
                                            {language === 'vi' ? 'Quay lại' : 'Back'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </main>
                </div>
            );
        }

        // Keep wrong questions start screen simple as before
        const noQuestions = questions.length === 0;
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
                <Navbar />
                <main className="pt-32 px-6 max-w-2xl mx-auto pb-20">
                    <Card className="p-10 text-center space-y-8 rounded-[3rem] shadow-2xl border-none">
                        <div className="mx-auto w-24 h-24 bg-sky-50 dark:bg-sky-900/20 text-sky-600 rounded-[2rem] flex items-center justify-center mb-2 shadow-inner">
                            <LayoutGrid className="h-12 w-12" />
                        </div>
                        <div className="space-y-4">
                            <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-50">
                                {language === 'vi' ? `Ôn tập câu sai: ${subject}` : `Review Errors: ${subject}`}
                            </h1>
                            <p className="text-zinc-500 leading-relaxed">
                                {noQuestions 
                                    ? (language === 'vi' 
                                        ? 'Chúc mừng! Bạn hiện tại không có câu hỏi nào bị trả lời sai trong môn học này.' 
                                        : 'Congratulations! You currently have no incorrect questions in this subject.')
                                    : (language === 'vi' 
                                        ? 'Bạn đang ôn tập lại toàn bộ câu hỏi đã từng trả lời sai của môn học này. Hãy trả lời chính xác để tự động loại bỏ chúng khỏi danh sách ôn tập!' 
                                        : 'You are reviewing all questions you previously answered incorrectly. Answer correctly to automatically remove them from the review list!')}
                            </p>
                            {!noQuestions && (
                                <div className="flex justify-center gap-6 py-4">
                                    <div className="flex items-center gap-2 text-zinc-600 font-bold bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-2xl">
                                        <BookOpen className="h-5 w-5 text-sky-500" /> {questions.length} {language === 'vi' ? 'Câu hỏi' : 'Questions'}
                                    </div>
                                    <div className="flex items-center gap-2 text-zinc-600 font-bold bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-2xl">
                                        <Zap className="h-5 w-5 text-yellow-500" /> {language === 'vi' ? 'Không giới hạn' : 'Unlimited'}
                                    </div>
                                </div>
                            )}
                        </div>
                        {noQuestions ? (
                            <Button onClick={() => router.push('/review')} className="w-full h-16 rounded-3xl bg-sky-600 text-xl font-bold hover:scale-105 transition-transform shadow-xl shadow-sky-500/20">
                                {language === 'vi' ? 'Quay lại trang Ôn tập' : 'Back to Review'}
                            </Button>
                        ) : (
                            <Button onClick={() => setIsStarted(true)} className="w-full h-16 rounded-3xl bg-sky-600 text-xl font-bold hover:scale-105 transition-transform shadow-xl shadow-sky-500/20">
                                {language === 'vi' ? 'Bắt đầu ôn tập' : 'Start Review'}
                            </Button>
                        )}
                        <Button variant="ghost" onClick={() => router.back()} className="text-zinc-400">Quay lại</Button>
                    </Card>
                </main>
            </div>
        );
    }

    const answeredCount = Object.keys(answers).length;
    const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <Navbar />



            <main className="pt-32 px-6 max-w-4xl mx-auto pb-32 space-y-6">
                {/* Sticky Progress Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 p-3 md:p-4 rounded-xl sticky top-20 z-10 backdrop-blur-md shadow-sm gap-2 sm:gap-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-sky-100 dark:bg-sky-900/30 text-sky-600 rounded-[1.25rem] flex items-center justify-center shrink-0">
                            <LayoutGrid className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-300 uppercase tracking-widest leading-none mb-1">Đang luyện tập môn</p>
                            <p className="text-sm font-black truncate max-w-[150px] sm:max-w-none text-zinc-900 dark:text-zinc-50">{subject}</p>
                        </div>
                    </div>
                    <div className="flex flex-1 sm:max-w-[400px] w-full items-center gap-4">
                        <div className="flex-1 h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-500 ease-out"
                            />
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-300 uppercase tracking-widest leading-none mb-1">Tiến độ</p>
                            <p className="text-sm sm:text-base font-black text-sky-600 dark:text-sky-400">{answeredCount} <span className="text-zinc-400 text-xs">/ {questions.length}</span></p>
                        </div>
                    </div>
                </div>



                {!isSubmitted && (
                    <div className="flex items-center gap-3 pt-6 mb-4">
                        <Button
                            onClick={onPreSubmit}
                            className="rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold h-10 px-6 shadow-md shadow-green-500/20 w-full sm:w-auto"
                        >
                            {language === 'vi' ? 'Nộp bài' : 'Submit'}
                        </Button>
                    </div>
                )}

                {isSubmitted && (
                    <div className="mt-8 mb-8 p-8 md:p-10 bg-sky-50 dark:bg-sky-900/10 rounded-[3rem] text-center space-y-6 border border-sky-100 dark:border-sky-800 shadow-lg animation-scale-in">
                        <div className="h-20 w-20 bg-yellow-100 text-yellow-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner transform -rotate-6">
                            <Trophy className="h-10 w-10" />
                        </div>
                        <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-50">{language === 'vi' ? 'Hoàn thành Luyện tập!' : 'Practice Completed!'}</h2>
                        <div className="text-5xl font-black text-sky-600 dark:text-sky-400">
                            {score} <span className="text-2xl text-zinc-400">/ {questions.length}</span>
                        </div>
                        <div className="flex justify-center gap-4 pt-4">
                            <Button onClick={() => window.location.reload()} className="h-12 rounded-2xl px-8 font-bold bg-sky-600 hover:bg-sky-700">
                                {language === 'vi' ? 'Luyện tập lại' : 'Practice Again'}
                            </Button>
                            <Button variant="outline" onClick={() => router.push('/courses')} className="h-12 rounded-2xl px-8 font-bold">
                                {language === 'vi' ? 'Về trang chủ' : 'Go to Home'}
                            </Button>
                        </div>
                    </div>
                )}

                <div className="space-y-6 pt-6 transition-all">
                    {!isSubmitted && questions.length > 0 && (
                        <div className="space-y-6">
                            {/* Question Map */}
                            <div className="p-4 md:p-6 bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-150 dark:border-zinc-800 shadow-sm space-y-4">
                                <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                    <span>{language === 'vi' ? 'Bản đồ câu hỏi' : 'Question Map'}</span>
                                </div>
                                <div className="flex flex-wrap gap-2 md:gap-3">
                                    {questions.map((_, idx) => {
                                        const ans = answers[idx];
                                        const isAnswered = ans !== undefined && (Array.isArray(ans) ? ans.length > 0 : String(ans).trim() !== "");
                                        const isActive = idx === currentQuestionIndex;
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => setCurrentQuestionIndex(idx)}
                                                className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl font-bold text-sm md:text-base transition-all flex items-center justify-center border-2 ${
                                                    isActive
                                                        ? 'border-sky-500 bg-sky-600 text-white shadow-lg shadow-sky-500/30 scale-110 z-10'
                                                        : isAnswered
                                                            ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-400 hover:border-sky-300'
                                                            : 'border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400 hover:border-zinc-300'
                                                }`}
                                            >
                                                {idx + 1}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Active Question */}
                            <PracticeQuestion
                                index={currentQuestionIndex}
                                question={questions[currentQuestionIndex]}
                                selected={answers[currentQuestionIndex] || (questions[currentQuestionIndex].type === 'multiple' ? [] : "")}
                                onChange={(val: any) => setAnswers(prev => ({ ...prev, [currentQuestionIndex]: val }))}
                                isRevealed={revealed[currentQuestionIndex]}
                                language={language}
                            />

                            {/* Navigation Bar */}
                            <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-[2rem] border border-zinc-150 dark:border-zinc-800 shadow-md">
                                <Button
                                    variant="outline"
                                    disabled={currentQuestionIndex === 0}
                                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                    className="rounded-2xl px-4 md:px-6 font-bold h-12"
                                >
                                    {language === 'vi' ? 'Quay lại' : 'Previous'}
                                </Button>
                                
                                <span className="font-extrabold text-sm md:text-base text-zinc-500 dark:text-zinc-400">
                                    <span className="text-zinc-900 dark:text-zinc-100">{currentQuestionIndex + 1}</span> / {questions.length}
                                </span>
                                
                                {currentQuestionIndex < questions.length - 1 ? (
                                    <Button
                                        onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                                        className="rounded-2xl px-4 md:px-6 font-bold h-12 bg-sky-600 text-white hover:bg-sky-700 shadow-lg shadow-sky-500/20"
                                    >
                                        {language === 'vi' ? 'Tiếp theo' : 'Next'}
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={onPreSubmit}
                                        className="rounded-2xl px-4 md:px-6 font-bold h-12 bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-500/25"
                                    >
                                        {language === 'vi' ? 'Nộp bài' : 'Submit'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {isSubmitted && questions.map((q, i) => (
                        <PracticeQuestion
                            key={i}
                            index={i}
                            question={q}
                            selected={answers[i] || (q.type === 'multiple' ? [] : "")}
                            onChange={(val: any) => setAnswers(prev => ({ ...prev, [i]: val }))}
                            isRevealed={revealed[i]}
                            language={language}
                        />
                    ))}
                </div>

                <ConfirmDialog
                    isOpen={confirmOpen}
                    title={language === 'vi' ? "Nộp bài luyện tập?" : "Submit Practice?"}
                    description={unansweredCount > 0
                        ? (language === 'vi' ? `Bạn còn ${unansweredCount} câu chưa chọn đáp án. Bạn có chắc chắn muốn nộp bài?` : `You have ${unansweredCount} unanswered questions. Are you sure you want to submit?`)
                        : (language === 'vi' ? "Bạn có chắc chắn muốn hoàn thành bài luyện tập?" : "Are you sure you want to finish the practice?")
                    }
                    confirmText={language === 'vi' ? "Nộp bài" : "Submit"}
                    variant={unansweredCount > 0 ? 'danger' : 'info'}
                    onConfirm={() => {
                        setConfirmOpen(false);
                        handleSubmit();
                    }}
                    onCancel={() => setConfirmOpen(false)}
                />

            </main>
        </div>
    );
}

export default function SubjectPracticePage({ params }: { params: Promise<{ subject: string }> }) {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-600"></div>
            </div>
        }>
            <PracticeContent params={params} />
        </Suspense>
    );
}
