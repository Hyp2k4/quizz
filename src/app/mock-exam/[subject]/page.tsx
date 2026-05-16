"use client";

import { useEffect, useState, use, useRef } from "react";
import { 
    getMockExamQuestions, 
    saveMockExamResult, 
    getMockExamLeaderboard,
    createNotification
} from "@/services/quizService";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "sonner";
import { 
    Trophy, CheckCircle, XCircle, AlertCircle, PlayCircle, 
    Timer, Sparkles, BookOpen, LogIn, ArrowRight, Home
} from "lucide-react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";

// Helper to format time for countdown (MM:SS)
const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
};

// Reuse arraysEqual
const arraysEqual = (a: any[], b: any[]) => {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, index) => val === sortedB[index]);
};

// Minimal QuestionTaker for Mock Exam (Simplified)
function ExamQuestion({
    question,
    index,
    selected,
    onChange,
    readOnly = false,
    isCorrect = undefined,
    language = 'vi'
}: any) {
    const isMultiple = question.type === 'multiple';
    const isOpen = question.type === 'open';

    const handleMultiChange = (opt: string, checked: boolean) => {
        if (readOnly) return;
        const current = Array.isArray(selected) ? selected : [];
        if (checked) {
            onChange([...current, opt]);
        } else {
            onChange(current.filter(i => i !== opt));
        }
    };

    return (
        <Card className={`mb-6 border-l-4 transition-all ${readOnly ? (isCorrect ? 'border-l-green-500 bg-green-50/10' : 'border-l-red-500 bg-red-50/10') : 'border-l-indigo-500'}`}>
            <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm ${readOnly ? (isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') : 'bg-indigo-100 text-indigo-700'}`}>
                        {readOnly ? (isCorrect ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />) : index + 1}
                    </div>
                    <div className="w-full min-w-0">
                        <h3 className="font-semibold text-base sm:text-lg mb-4 text-zinc-800 dark:text-zinc-100 break-words">{question.text}</h3>
                        
                        {question.imageUrl && (
                            <div className="mb-6 rounded-2xl overflow-hidden bg-zinc-50 border border-zinc-100 dark:border-zinc-800">
                                <img src={question.imageUrl} alt="Question" className="max-h-[300px] w-auto mx-auto object-contain" />
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-3">
                            {isOpen ? (
                                <textarea
                                    className="w-full p-4 rounded-xl border-2 border-zinc-100 dark:border-zinc-800 bg-white dark:bg-black/20 min-h-[120px] focus:border-indigo-500 outline-none transition-all"
                                    placeholder={language === 'vi' ? "Nhập câu trả lời..." : "Type answer..."}
                                    value={selected as string || ''}
                                    onChange={(e) => !readOnly && onChange(e.target.value)}
                                    disabled={readOnly}
                                />
                            ) : (
                                question.options?.map((opt: string, i: number) => {
                                    const isSelected = isMultiple ? (selected as string[])?.includes(opt) : selected === opt;
                                    const isActuallyCorrect = readOnly && (isMultiple ? question.correctAnswer?.includes(opt) : question.correctAnswer?.[0] === opt);
                                    
                                    let optionClass = `flex items-start gap-3 p-4 rounded-2xl border-2 transition-all ${readOnly ? 'cursor-default' : 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`;
                                    if (readOnly) {
                                        if (isActuallyCorrect) optionClass += " border-green-500 bg-green-50 dark:bg-green-900/20";
                                        else if (isSelected) optionClass += " border-red-500 bg-red-50 dark:bg-red-900/20";
                                        else optionClass += " border-transparent opacity-60";
                                    } else if (isSelected) {
                                        optionClass += " border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20";
                                    } else {
                                        optionClass += " border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900";
                                    }

                                    return (
                                        <label key={i} className={optionClass}>
                                            <input
                                                type={isMultiple ? "checkbox" : "radio"}
                                                checked={!!isSelected}
                                                onChange={() => !readOnly && (isMultiple ? handleMultiChange(opt, !isSelected) : onChange(opt))}
                                                disabled={readOnly}
                                                className="mt-1 w-4 h-4 text-indigo-600"
                                            />
                                            <span className="text-sm font-medium">{opt}</span>
                                        </label>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function MockExamPage({ params }: { params: Promise<{ subject: string }> }) {
    const { subject: rawSubject } = use(params);
    const subject = decodeURIComponent(rawSubject);
    const router = useRouter();
    const { user, login } = useAuth();
    const { language } = useLanguage();

    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isStarted, setIsStarted] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [timeLeft, setTimeLeft] = useState(3600); // 60 minutes
    const [answers, setAnswers] = useState<Record<number, any>>({});
    const [score, setScore] = useState(0);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [confirmOpen, setConfirmOpen] = useState(false);

    useEffect(() => {
        async function fetch() {
            setLoading(true);
            const qs = await getMockExamQuestions(subject);
            setQuestions(qs);
            setLoading(false);
        }
        fetch();
        getMockExamLeaderboard(subject).then(setLeaderboard);
    }, [subject]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isStarted && !isSubmitted && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isStarted && !isSubmitted) {
            handleSubmit();
        }
        return () => clearInterval(timer);
    }, [isStarted, isSubmitted, timeLeft]);

    const handleSubmit = async () => {
        if (isSubmitted) return;
        
        let calculatedScore = 0;
        questions.forEach((q, idx) => {
            const userAns = answers[idx];
            const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer || ""];
            let isItemCorrect = false;

            if (q.type === 'multiple') isItemCorrect = arraysEqual(userAns as string[], correctArr);
            else if (q.type === 'single') isItemCorrect = correctArr.includes(userAns as string);
            else isItemCorrect = (userAns as string || "").trim().toLowerCase() === (correctArr[0] as string || "").trim().toLowerCase();

            if (isItemCorrect) calculatedScore++;
        });

        setScore(calculatedScore);
        setIsSubmitted(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (user) {
            await saveMockExamResult({
                subject,
                userId: user.uid,
                userName: user.displayName || "Anonymous",
                score: calculatedScore,
                totalQuestions: questions.length,
                timeTakenMs: (3600 - timeLeft) * 1000
            });
            getMockExamLeaderboard(subject).then(setLeaderboard);

            await createNotification({
                userId: user.uid,
                type: 'quiz_complete',
                title: language === 'vi' ? 'Kết quả thi thử' : 'Mock Exam Result',
                message: `${language === 'vi' ? 'Bạn đã hoàn thành thi thử môn' : 'You completed mock exam for'} ${subject}: ${calculatedScore}/${questions.length}`,
                link: `/mock-exam/${encodeURIComponent(subject)}`
            });
        }
        
        if (calculatedScore / questions.length >= 0.8) {
            triggerConfetti();
        }
    };

    const triggerConfetti = () => {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading exam...</div>;

    if (!user) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
                <Navbar />
                <main className="pt-40 flex items-center justify-center p-6">
                    <Card className="max-w-md w-full p-8 text-center space-y-6">
                        <LogIn className="h-16 w-16 text-indigo-600 mx-auto" />
                        <h2 className="text-2xl font-bold">Đăng nhập để thi thử</h2>
                        <p className="text-zinc-500">Bạn cần đăng nhập để hệ thống ghi nhận kết quả và xếp hạng.</p>
                        <Button onClick={() => login()} className="w-full h-12 rounded-xl bg-indigo-600">Đăng nhập</Button>
                    </Card>
                </main>
            </div>
        );
    }

    if (!isStarted) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
                <Navbar />
                <main className="pt-32 px-4 sm:px-6 max-w-2xl mx-auto pb-20">
                    <Card className="p-6 sm:p-10 text-center space-y-6 sm:space-y-8 rounded-[2rem] sm:rounded-[3rem] shadow-2xl border-none bg-white dark:bg-zinc-900">
                        <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center mb-2 shadow-inner transform -rotate-6">
                            <Trophy className="h-10 w-10 sm:h-12 sm:w-12" />
                        </div>
                        <div className="space-y-4">
                            <h1 className="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-zinc-50 leading-tight">Thi thử môn {subject}</h1>
                            <div className="flex flex-wrap justify-center gap-3 sm:gap-6 py-4">
                                <div className="flex items-center gap-2 text-zinc-600 text-sm sm:text-base font-bold bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-xl">
                                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" /> 40 {language === 'vi' ? 'Câu hỏi' : 'Questions'}
                                </div>
                                <div className="flex items-center gap-2 text-zinc-600 text-sm sm:text-base font-bold bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-xl">
                                    <Timer className="h-4 w-4 sm:h-5 sm:w-5" /> 60 {language === 'vi' ? 'Phút' : 'Minutes'}
                                </div>
                                <div className="flex items-center gap-2 text-zinc-600 text-sm sm:text-base font-bold bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-xl">
                                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" /> {language === 'vi' ? 'Ngẫu nhiên' : 'Random'}
                                </div>
                            </div>
                        </div>
                        <Button onClick={() => setIsStarted(true)} className="w-full h-14 sm:h-16 rounded-2xl sm:rounded-3xl bg-indigo-600 text-lg sm:text-xl font-bold hover:scale-105 transition-transform shadow-xl shadow-indigo-500/20">
                            Bắt đầu thi ngay
                        </Button>
                    </Card>

                    <div className="mt-12 space-y-6">
                        <h3 className="text-xl font-black flex items-center gap-2 px-2">
                            <Trophy className="h-5 w-5 text-yellow-500" /> BXH {subject}
                        </h3>
                        <div className="space-y-3">
                            {leaderboard.map((r, i) => (
                                <div key={r.id} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-zinc-100 text-zinc-600'}`}>{i + 1}</span>
                                        <span className="font-bold truncate text-sm sm:text-base">{r.userName}</span>
                                    </div>
                                    <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                                        <span className="text-indigo-600 font-black text-sm sm:text-base">{r.score}/{r.totalQuestions}</span>
                                        <span className="text-[10px] sm:text-xs text-zinc-400 font-mono">{formatCountdown(Math.floor(r.timeTakenMs / 1000))}</span>
                                    </div>
                                </div>
                            ))}
                            {leaderboard.length === 0 && <p className="text-center py-8 text-zinc-400">Chưa có ai thi thử môn này. Hãy là người đầu tiên!</p>}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <Navbar />
            <main className="pt-32 px-6 max-w-4xl mx-auto pb-32">
                {/* Fixed Header with Timer */}
                <div className="fixed top-20 sm:top-24 left-0 right-0 z-40 px-4 sm:px-6 pointer-events-none">
                    <div className="max-w-4xl mx-auto flex justify-between items-center bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-3 sm:p-4 rounded-[1.5rem] sm:rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-xl pointer-events-auto">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center">
                                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[8px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-widest truncate">{language === 'vi' ? 'Đang thi thử' : 'Exam in progress'}</p>
                                <p className="text-xs sm:text-sm font-black truncate max-w-[80px] md:max-w-none">{subject}</p>
                            </div>
                        </div>

                        <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl ${timeLeft < 300 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-indigo-50 text-indigo-600'}`}>
                            <Timer className="h-4 w-4 sm:h-5 sm:w-5" />
                            <span className="text-lg sm:text-2xl font-black font-mono">{formatCountdown(timeLeft)}</span>
                        </div>

                        <div className="flex items-center gap-2 text-zinc-400 text-[10px] sm:text-sm font-bold">
                            <span className="hidden xs:inline">{Object.keys(answers).length} / {questions.length}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 pt-20">
                    {questions.map((q, i) => (
                        <ExamQuestion
                            key={i}
                            index={i}
                            question={q}
                            selected={answers[i]}
                            onChange={(val: any) => setAnswers(prev => ({ ...prev, [i]: val }))}
                            readOnly={isSubmitted}
                            isCorrect={isSubmitted ? (
                                q.type === 'multiple' 
                                ? arraysEqual(answers[i], q.correctAnswer)
                                : q.type === 'single'
                                ? q.correctAnswer.includes(answers[i])
                                : (answers[i] || "").trim().toLowerCase() === (q.correctAnswer[0] || "").trim().toLowerCase()
                            ) : undefined}
                            language={language}
                        />
                    ))}
                </div>

                {!isSubmitted && (
                    <div className="fixed bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 sm:px-6 z-40">
                        <Button 
                            onClick={() => setConfirmOpen(true)}
                            className="w-full h-14 sm:h-16 rounded-2xl sm:rounded-3xl bg-indigo-600 text-lg sm:text-xl font-bold shadow-2xl shadow-indigo-500/40 hover:scale-[1.02] transition-transform active:scale-95"
                        >
                            Nộp bài thi
                        </Button>
                    </div>
                )}

                {isSubmitted && (
                    <div className="mt-12 p-10 bg-white dark:bg-zinc-900 rounded-[3rem] text-center space-y-8 shadow-2xl border-2 border-indigo-500/20">
                        <div className="mx-auto w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center">
                            <Trophy className="h-10 w-10" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black">Kết quả thi thử</h2>
                            <p className="text-5xl font-black text-indigo-600">{score} <span className="text-2xl text-zinc-400">/ {questions.length}</span></p>
                        </div>
                        <div className="flex justify-center gap-4">
                            <Button variant="outline" onClick={() => window.location.reload()} className="h-12 rounded-2xl px-8 font-bold">Thử lại bài mới</Button>
                            <Button onClick={() => router.push('/courses')} className="h-12 rounded-2xl px-8 font-bold bg-indigo-600">Về trang chủ</Button>
                        </div>
                    </div>
                )}

                <ConfirmDialog
                    isOpen={confirmOpen}
                    onCancel={() => setConfirmOpen(false)}
                    onConfirm={() => {
                        setConfirmOpen(false);
                        handleSubmit();
                    }}
                    title="Nộp bài thi?"
                    description={`Bạn đã làm được ${Object.keys(answers).length}/${questions.length} câu. Bạn có chắc chắn muốn nộp bài không?`}
                />
            </main>
        </div>
    );
}
