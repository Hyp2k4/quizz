"use client";

import { useEffect, useState, use, useRef, Suspense } from "react";
import {
    getAllSubjectQuestions,
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

import {
    Trophy, CheckCircle, XCircle, AlertCircle, PlayCircle,
    BookOpen, LogIn, ArrowRight, Home, LayoutGrid, Zap
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
                                    {!isRevealed && (selected as string)?.length > 0 && (
                                        <div className="flex justify-end">
                                            <Button onClick={onReveal} className="rounded-full px-6">
                                                {language === 'vi' ? 'Kiểm tra' : 'Check'}
                                            </Button>
                                        </div>
                                    )}
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
                                                    onChange={() => !isRevealed && (isMultiple ? handleMultiChange(opt, !isSelected) : (onChange(opt), onReveal()))}
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

                        {isMultiple && !isRevealed && (selected as string[])?.length > 0 && (
                            <div className="mt-4 flex justify-end">
                                <Button onClick={onReveal} variant="secondary" className="rounded-full px-6">
                                    {language === 'vi' ? 'Xác nhận' : 'Confirm'}
                                </Button>
                            </div>
                        )}

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

    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isStarted, setIsStarted] = useState(false);
    const [answers, setAnswers] = useState<Record<number, any>>({});
    const [revealed, setRevealed] = useState<Record<number, boolean>>({});
    const [score, setScore] = useState(0);

    useEffect(() => {
        async function fetch() {
            setLoading(true);
            let qs = [];
            if (mode === 'wrong' && user) {
                qs = await getSubjectWrongQuestions(user.uid, subject);
            } else {
                qs = await getAllSubjectQuestions(subject);
            }
            setQuestions(qs);
            setLoading(false);
        }
        if (user || mode !== 'wrong') {
            fetch();
        }
    }, [subject, mode, user]);

    const handleReveal = (idx: number, currentAnswer?: any) => {
        if (revealed[idx]) return;

        setRevealed(prev => ({ ...prev, [idx]: true }));

        const q = questions[idx];
        const userAns = currentAnswer !== undefined ? currentAnswer : answers[idx];
        const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer || ""];
        let isCorrect = false;

        if (q.type === 'multiple') isCorrect = arraysEqual(userAns as string[], correctArr);
        else if (q.type === 'single') isCorrect = correctArr.includes(userAns as string);
        else isCorrect = (userAns as string || "").trim().toLowerCase() === (correctArr[0] as string || "").trim().toLowerCase();

        if (isCorrect) {
            setScore(prev => prev + 1);
        }

        // Real-time sync with subject wrong questions
        if (user && subject) {
            syncSubjectWrongQuestions(user.uid, subject, [{ question: q, isCorrect }]);
        }

        // Check if finished
        const newAnsweredCount = Object.keys(revealed).length + 1;
        if (newAnsweredCount === questions.length) {
            // Award coins
            if (userData) {
                const finalScore = isCorrect ? score + 1 : score;
                const earnedCoins = Math.round((finalScore / questions.length) * 1000);
                if (earnedCoins > 0) {
                    const awardCoins = async () => {
                        try {
                            const { doc, updateDoc, increment } = await import("firebase/firestore");
                            const { db } = await import("@/lib/firebase");
                            const userRef = doc(db, "users", user!.uid);
                            await updateDoc(userRef, {
                                snowyCoins: increment(earnedCoins)
                            });
                            if (refreshUserData) await refreshUserData();
                            toast.success(language === 'vi' ? `Hoàn thành! Bạn nhận được ${earnedCoins} Snowy Coins! ❄️` : `Completed! You earned ${earnedCoins} Snowy Coins! ❄️`);
                        } catch (err) {
                            console.error("Error adding coins", err);
                        }
                    };
                    awardCoins();
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
                                {mode === 'wrong' 
                                    ? (language === 'vi' ? `Ôn tập câu sai: ${subject}` : `Review Errors: ${subject}`)
                                    : (language === 'vi' ? `Luyện tập môn ${subject}` : `Practice: ${subject}`)}
                            </h1>
                            <p className="text-zinc-500 leading-relaxed">
                                {noQuestions 
                                    ? (language === 'vi' 
                                        ? 'Chúc mừng! Bạn hiện tại không có câu hỏi nào bị trả lời sai trong môn học này.' 
                                        : 'Congratulations! You currently have no incorrect questions in this subject.')
                                    : (mode === 'wrong'
                                        ? (language === 'vi' 
                                            ? 'Bạn đang ôn tập lại toàn bộ câu hỏi đã từng trả lời sai của môn học này. Hãy trả lời chính xác để tự động loại bỏ chúng khỏi danh sách ôn tập!' 
                                            : 'You are reviewing all questions you previously answered incorrectly. Answer correctly to automatically remove them from the review list!')
                                        : (language === 'vi'
                                            ? 'Bạn sẽ làm toàn bộ các câu hỏi có trong môn học này mà không giới hạn thời gian. Đáp án sẽ được hiển thị ngay sau khi bạn trả lời.'
                                            : 'You will go through all the questions in this subject with no time limit. Answers will be shown immediately.'))}
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
                                {mode === 'wrong' 
                                    ? (language === 'vi' ? 'Bắt đầu ôn tập' : 'Start Review') 
                                    : (language === 'vi' ? 'Bắt đầu luyện tập' : 'Start Practice')}
                            </Button>
                        )}
                        <Button variant="ghost" onClick={() => router.back()} className="text-zinc-400">Quay lại</Button>
                    </Card>
                </main>
            </div>
        );
    }

    const answeredCount = Object.keys(revealed).length;
    const progress = (answeredCount / questions.length) * 100;
    const isFinished = answeredCount === questions.length && questions.length > 0;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <Navbar />



            <main className="pt-32 px-6 max-w-4xl mx-auto pb-32">
                {/* Fixed Progress Bar */}
                <div className="fixed top-24 left-0 right-0 z-40 px-4 sm:px-6 pointer-events-none">
                    <div className="max-w-4xl mx-auto bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl pointer-events-auto">
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-sky-50 dark:bg-sky-900/20 text-sky-600 rounded-2xl flex items-center justify-center">
                                    <LayoutGrid className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Đang luyện tập môn</p>
                                    <p className="text-sm font-black truncate max-w-[150px] sm:max-w-none">{subject}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Tiến độ</p>
                                <p className="text-lg font-black text-sky-600">{answeredCount} <span className="text-zinc-400 text-sm">/ {questions.length}</span></p>
                            </div>
                        </div>
                        <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-500 ease-out"
                            />
                        </div>
                    </div>
                </div>



                <div className="space-y-6 pt-6 transition-all">
                    {questions.map((q, i) => (
                        <PracticeQuestion
                            key={i}
                            index={i}
                            question={q}
                            selected={answers[i]}
                            onChange={(val: any) => setAnswers(prev => ({ ...prev, [i]: val }))}
                            isRevealed={revealed[i]}
                            onReveal={(val?: any) => handleReveal(i, val)}
                            language={language}
                        />
                    ))}
                </div>

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
