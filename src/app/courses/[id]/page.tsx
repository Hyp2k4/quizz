"use client";

import { useEffect, useState, use, useRef } from "react";
import { getQuizById, saveQuizResult, QuizData, QuizResult, createNotification, getQuizLeaderboard, verifyQuizAccessCode } from "@/services/quizService";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "sonner";
import { Trophy, CheckCircle, XCircle, AlertCircle, PlayCircle, Flame, Zap, Lock, Key, Layers } from "lucide-react";
import confetti from "canvas-confetti";

// Helper to format time
const formatTime = (ms: number, language: string = 'vi') => {
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
};

// Helper to compare arrays (for multiple choice)
const arraysEqual = (a: any[], b: any[]) => {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, index) => val === sortedB[index]);
};

function Leaderboard({ quizId, language = 'vi' }: { quizId: string, language?: string }) {
    const [results, setResults] = useState<QuizResult[]>([]);

    useEffect(() => {
        getQuizLeaderboard(quizId).then(setResults);
    }, [quizId]);

    return (
        <div className="w-full max-w-sm mx-auto mt-8 bg-white dark:bg-white/5 rounded-xl p-4 shadow-inner">
            <h3 className="text-center font-bold mb-4 flex items-center justify-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" /> {language === 'vi' ? 'Bảng xếp hạng' : 'Leaderboard'}
            </h3>
            <div className="space-y-2">
                {results.map((r, i) => (
                    <div key={r.id} className={`flex justify-between items-center text-sm p-2 rounded-lg ${i < 3 ? 'bg-yellow-500/10 border border-yellow-500/20' : ''}`}>
                        <div className="flex items-center gap-3">
                            <span className={`font-mono font-bold w-4 text-center ${i === 0 ? 'text-yellow-600' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-700' : 'text-gray-500'}`}>
                                {i + 1}
                            </span>
                            <span className="font-medium truncate max-w-[120px]">{r.userName}</span>
                        </div>
                        <div className="flex gap-3 text-xs text-[rgb(var(--muted-foreground))]">
                            <span className="font-bold text-[rgb(var(--foreground))]">{r.score}/{r.totalQuestions}</span>
                        </div>
                    </div>
                ))}
                {results.length === 0 && <p className="text-center text-xs text-gray-400">{language === 'vi' ? 'Hãy là người đầu tiên hoàn thành!' : 'Be the first to finish!'}</p>}
            </div>
        </div>
    );
}

function QuestionTaker({
    question,
    index,
    selected,
    onChange,
    readOnly = false,
    isCorrect = undefined,
    onCheck,
    isRevealed = false,
    language = 'vi'
}: {
    question: any,
    index: number,
    selected: string | string[],
    onChange: (val: string | string[]) => void,
    readOnly?: boolean,
    isCorrect?: boolean,
    onCheck?: () => void,
    isRevealed?: boolean,
    language?: string
}) {
    const isMultiple = question.type === 'multiple';
    const isOpen = question.type === 'open';

    const handleMultiChange = (opt: string, checked: boolean) => {
        if (readOnly || isRevealed) return;
        const current = Array.isArray(selected) ? selected : [];
        if (checked) {
            onChange([...current, opt]);
        } else {
            onChange(current.filter(i => i !== opt));
        }
    };

    const showResult = readOnly || isRevealed;

    let borderClass = "border-l-indigo-500";
    if (showResult && isCorrect === true) borderClass = "border-l-green-500 bg-green-50/10";
    if (showResult && isCorrect === false) borderClass = "border-l-red-500 bg-red-50/10";

    const isUnfinished = question.type !== 'open' && (!question.correctAnswer || question.correctAnswer.length === 0);

    return (
        <Card className={`mb-6 border-l-4 shadow-md transition-colors ${borderClass} ${isUnfinished ? 'opacity-50 grayscale-[0.5]' : ''}`}>
            <CardContent className="pt-6">
                <div className="flex gap-4">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold shrink-0 ${showResult ? (isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') : 'bg-indigo-100 text-indigo-700'}`}>
                        {showResult ? (isCorrect ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />) : index + 1}
                    </div>
                    <div className="w-full">
                        <h3 className="font-semibold text-lg mb-4">{question.text}</h3>
                        
                        {question.imageUrl && (
                            <div className="mb-6 rounded-2xl overflow-hidden bg-zinc-50 border border-zinc-100 dark:border-zinc-800">
                                <img src={question.imageUrl} alt="Question media" className="max-h-[400px] w-auto mx-auto object-contain" />
                            </div>
                        )}

                        <div className="space-y-3">
                            {isOpen ? (
                                <div className="space-y-2">
                                    <textarea
                                        className="w-full p-3 rounded-lg border bg-white dark:bg-black/20 min-h-[100px]"
                                        placeholder={language === 'vi' ? "Nhập câu trả lời của bạn vào đây..." : "Type your answer here..."}
                                        value={selected as string || ''}
                                        onChange={(e) => !showResult && onChange(e.target.value)}
                                        disabled={showResult}
                                    />
                                    {!showResult && (selected as string)?.length > 0 && (
                                        <div className="flex justify-end">
                                            <Button size="sm" onClick={onCheck} className="rounded-full">
                                                {language === 'vi' ? 'Kiểm tra' : 'Check'}
                                            </Button>
                                        </div>
                                    )}
                                    {showResult && (
                                        <div className="space-y-4 pt-2">
                                            {question.answerImageUrl && (
                                                <div className="rounded-2xl overflow-hidden bg-zinc-50 border border-zinc-100 dark:border-zinc-800">
                                                    <img src={question.answerImageUrl} alt="Answer media" className="max-h-[300px] w-auto mx-auto object-contain" />
                                                </div>
                                            )}
                                            <div className="text-sm text-[rgb(var(--muted-foreground))]">
                                                <strong>{language === 'vi' ? 'Đáp án mẫu' : 'Model Answer'}:</strong> {question.correctAnswer?.[0] || (language === 'vi' ? "Chưa có đáp án mẫu" : "No model answer provided")}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                question.options?.map((opt: string, i: number) => {
                                    const isSelected = isMultiple
                                        ? (selected as string[])?.includes(opt)
                                        : selected === opt;

                                    const isActuallyCorrect = showResult && (isMultiple
                                        ? question.correctAnswer?.includes(opt)
                                        : question.correctAnswer?.[0] === opt);

                                    let optionClass = `flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${showResult ? 'cursor-default' : 'hover:bg-indigo-50 dark:hover:bg-zinc-800'}`;

                                    if (showResult) {
                                        if (isActuallyCorrect) {
                                            optionClass += " border-green-500 bg-green-50 dark:bg-green-900/20 ";
                                        } else if (isSelected) {
                                            optionClass += " border-red-500 bg-red-50 dark:bg-red-900/20 ";
                                        } else {
                                            optionClass += " border-transparent bg-zinc-100 dark:bg-zinc-800 opacity-50 ";
                                        }
                                    } else if (isSelected) {
                                        optionClass += " border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ";
                                    } else {
                                        optionClass += " border-transparent bg-zinc-100 dark:bg-zinc-800 ";
                                    }

                                    return (
                                        <label
                                            key={i}
                                            className={optionClass}
                                        >
                                            <input
                                                type={isMultiple ? "checkbox" : "radio"}
                                                name={`question-${index}`}
                                                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 shrink-0"
                                                checked={!!isSelected}
                                                onChange={() => !showResult && (isMultiple ? handleMultiChange(opt, !isSelected) : onChange(opt))}
                                                disabled={showResult}
                                            />
                                            <div className="flex-1 flex items-center justify-between gap-2 overflow-hidden">
                                                <span className="text-sm truncate">{opt}</span>
                                                {showResult && (
                                                    isActuallyCorrect ? (
                                                        <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                                                    ) : isSelected ? (
                                                        <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                                                    ) : null
                                                )}
                                            </div>
                                        </label>
                                    );
                                })
                            )}
                        </div>
                        {isMultiple && !showResult && (selected as string[])?.length > 0 && (
                            <div className="mt-4 flex justify-end">
                                <Button size="sm" variant="secondary" onClick={onCheck} className="rounded-full">
                                    {language === 'vi' ? 'Xác nhận đáp án' : 'Confirm Answer'}
                                </Button>
                            </div>
                        )}
                        {showResult && !isCorrect && question.explanation && (
                            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-lg text-sm flex gap-2">
                                <AlertCircle className="h-5 w-5 shrink-0" />
                                <div>
                                    <span className="font-bold">{language === 'vi' ? 'Giải thích' : 'Explanation'}:</span> {question.explanation}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// Result Graph Component
function ScorePath({ score, total, language = 'vi' }: { score: number, total: number, language?: string }) {
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

    return (
        <div className="py-8 text-center space-y-6 w-full max-w-md mx-auto">
            <div className="relative h-4 bg-gray-200 rounded-full w-full overflow-hidden">
                <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-1000 ease-out"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <div className="flex justify-between text-xs font-mono text-gray-400 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
            </div>

            <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                    <p className="text-sm text-gray-500">{language === 'vi' ? 'Số câu đúng' : 'Correct Answers'}</p>
                    <p className="text-4xl font-bold">{score} <span className="text-lg text-gray-400">/ {total}</span></p>
                </div>
                <div className="h-12 w-[1px] bg-gray-300" />
                <div className="text-center">
                    <p className="text-sm text-gray-500">{language === 'vi' ? 'Điểm của bạn' : 'Your Score'}</p>
                    <p className={`text-4xl font-bold ${percentage >= 80 ? 'text-green-600' : percentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {percentage}
                    </p>
                </div>
            </div>
        </div>
    )
}

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { user, guestName, setGuestName, login } = useAuth();
    const { t, language } = useLanguage();
    const [quiz, setQuiz] = useState<QuizData | null>(null);
    const [loading, setLoading] = useState(true);
    const [tempName, setTempName] = useState("");

    const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [unansweredCount, setUnansweredCount] = useState(0);
    const [revealed, setRevealed] = useState<Record<number, boolean>>({});

    // New state for starting the quiz
    const [isReadyToStart, setIsReadyToStart] = useState(false);
    const streakRef = useRef(0);

    // Private Access State
    const [isAccessGranted, setIsAccessGranted] = useState(false);
    const [inputCode, setInputCode] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);

    // Timer State
    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0); // for display only
    const [finalTimeMs, setFinalTimeMs] = useState(0);

    // Access Check
    const hasAccess = !!user || !!guestName;

    // Fetch Quiz
    useEffect(() => {
        async function fetch() {
            if (id) {
                const data = await getQuizById(id);
                if (data) {
                    // Filter out questions with no correct answers for users
                    const filteredQuestions = data.questions.filter(q =>
                        q.type === 'open' || (q.correctAnswer && q.correctAnswer.length > 0)
                    );
                    setQuiz({ ...data, questions: filteredQuestions });

                    // Check if access is automatically granted
                    const isOwner = user && data.userId === user.uid;
                    const isCollab = user && data.collaborators?.includes(user.email || "");
                    if (data.visibility !== 'private' || isOwner || isCollab) {
                        setIsAccessGranted(true);
                    }
                }
                setLoading(false);
            }
        }
        fetch();
    }, [id, user]);

    // Auto-fill code from URL
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const codeFromUrl = queryParams.get('code');
        if (codeFromUrl && !isAccessGranted) {
            setInputCode(codeFromUrl.toUpperCase());
            // Small delay to ensure quiz is loaded before verifying
            const timer = setTimeout(() => {
                if (quiz?.id) {
                    verifyQuizAccessCode(quiz.id, codeFromUrl.toUpperCase()).then(isValid => {
                        if (isValid) setIsAccessGranted(true);
                    });
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [quiz?.id, isAccessGranted]);

    // Timer Effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (quiz && hasAccess && isReadyToStart && !isSubmitted && !startTime) {
            setStartTime(Date.now());
        }

        if (startTime && !isSubmitted) {
            interval = setInterval(() => {
                setElapsedTime(Date.now() - startTime);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [quiz, hasAccess, startTime, isSubmitted, isReadyToStart]);


    const handleJoinAsGuest = () => {
        if (tempName.trim()) setGuestName(tempName);
    };

    const handleVerifyCode = async () => {
        if (!quiz?.id || !inputCode.trim()) return;
        setIsVerifying(true);
        try {
            const isValid = await verifyQuizAccessCode(quiz.id, inputCode.trim().toUpperCase());
            if (isValid) {
                setIsAccessGranted(true);
                toast.success(language === 'vi' ? "Mã truy cập chính xác!" : "Correct access code!");
            } else {
                toast.error(t.visibility.invalidCode);
            }
        } catch (error) {
            toast.error(language === 'vi' ? "Lỗi khi xác thực mã" : "Error authenticating code");
        } finally {
            setIsVerifying(false);
        }
    };

    const handleAnswer = (qIndex: number, val: string | string[]) => {
        if (isSubmitted || revealed[qIndex]) return;
        setAnswers(prev => ({ ...prev, [qIndex]: val }));

        // Auto-reveal for single choice
        if (quiz && quiz.questions[qIndex].type === 'single') {
            setRevealed(prev => ({ ...prev, [qIndex]: true }));
            checkStreakAfterAnswer(qIndex, val);
        }
    };

    const handleCheckIndividual = (qIndex: number) => {
        setRevealed(prev => ({ ...prev, [qIndex]: true }));
        checkStreakAfterAnswer(qIndex, answers[qIndex]);
    };

    const checkStreakAfterAnswer = (qIndex: number, val: any) => {
        if (!quiz) return;
        const q = quiz.questions[qIndex];
        const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer || ""];
        let isCorrect = false;

        if (q.type === 'multiple') {
            isCorrect = arraysEqual(val as string[], correctArr);
        } else if (q.type === 'single') {
            isCorrect = correctArr.includes(val as string);
        } else {
            // Open ended - simple match
            isCorrect = (val as string || "").trim().toLowerCase() === (correctArr[0] as string || "").trim().toLowerCase();
        }

        if (isCorrect) {
            streakRef.current = streakRef.current + 1;
            if (streakRef.current >= 5) {
                triggerConfetti();
                toast.success(language === 'vi' ? `TUYỆT VỜI! Chuỗi ${streakRef.current} câu đúng liên tiếp! 🔥` : `AMAZING! Streak of ${streakRef.current} correct answers! 🔥`, { duration: 4000 });
            }
        } else {
            streakRef.current = 0;
        }
    };

    const onPreSubmit = () => {
        if (!quiz) return;
        const total = quiz.questions.length;
        // Answered is questions that are revealed
        const answeredCount = Object.keys(revealed).length;
        const missing = total - answeredCount;

        setUnansweredCount(missing);
        setConfirmOpen(true);
    };

    const handleSubmit = async () => {
        if (!quiz) return;

        const infoTime = startTime ? Date.now() - startTime : 0;
        setFinalTimeMs(infoTime);

        let calculatedScore = 0;

        quiz.questions.forEach((q, index) => {
            const userAns = answers[index];
            const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer || ""];
            let isItemCorrect = false;

            if (q.type === 'multiple') {
                isItemCorrect = arraysEqual(userAns as string[], correctArr);
            } else if (q.type === 'single') {
                isItemCorrect = correctArr.includes(userAns as string);
            } else {
                isItemCorrect = (userAns as string || "").trim().toLowerCase() === (correctArr[0] as string || "").trim().toLowerCase();
            }

            if (isItemCorrect) {
                calculatedScore++;
            }
        });

        setScore(calculatedScore);
        setIsSubmitted(true);

        toast.success(`Quiz submitted! Score: ${calculatedScore}/${quiz.questions.length}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Save Result
        await saveQuizResult({
            quizId: id as string,
            userId: user?.uid || "guest",
            userName: user?.displayName || guestName || "Guest",
            score: calculatedScore,
            totalQuestions: quiz.questions.length,
            timeTakenMs: infoTime
        });

        // Create notification and send email for course owner
        if (quiz.userId) {
            await createNotification({
                userId: quiz.userId,
                type: 'quiz_complete',
                title: language === 'vi' ? 'Bản tin Lustio: Có người hoàn thành bài thi!' : 'Lustio News: Quiz Completed!',
                message: `${user?.displayName || guestName || (language === 'vi' ? "Khách" : "Guest")} ${language === 'vi' ? 'vừa hoàn thành' : 'just completed'} "${quiz.title}" ${language === 'vi' ? 'với số điểm' : 'with score'} ${calculatedScore}/${quiz.questions.length}`,
                link: `/courses/${id}`
            });

            // Send email to author if email exists
            if (quiz.authorEmail) {
                const completionTime = (infoTime / 1000 / 60).toFixed(1) + " " + (language === 'vi' ? 'phút' : 'mins');
                fetch('/api/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'completion',
                        to: quiz.authorEmail,
                        language: language,
                        data: {
                            userName: user?.displayName || guestName || (language === 'vi' ? "Khách" : "Guest"),
                            quizTitle: quiz.title,
                            score: calculatedScore,
                            total: quiz.questions.length,
                            time: completionTime,
                            link: `${window.location.origin}/courses/${id}`
                        }
                    })
                }).catch(err => console.error("Error sending completion email notification:", err));
            }
        }
    };

    const triggerConfetti = () => {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
    };

    if (loading) return <div className="min-h-screen bg-[rgb(var(--background))] flex items-center justify-center">Loading...</div>;
    if (!quiz) return <div className="min-h-screen bg-[rgb(var(--background))] flex items-center justify-center">Quiz not found</div>;

    if (!isAccessGranted) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
                <Navbar />
                <main className="pt-40 px-6 flex items-center justify-center">
                    <Card className="w-full max-w-md p-8 text-center space-y-6 shadow-2xl rounded-[2.5rem] border-none bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
                        <div className="mx-auto w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-3xl flex items-center justify-center mb-2 shadow-inner">
                            <Lock className="h-10 w-10" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-50">Khóa học này là riêng tư</h2>
                            <p className="text-sm text-zinc-500">Vui lòng nhập mã truy cập được cung cấp bởi chủ khóa học để tiếp tục.</p>
                        </div>
                        <div className="space-y-4 pt-4">
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                                <input
                                    type="text"
                                    placeholder="NHẬP MÃ TRUY CẬP (VD: ABC123)"
                                    value={inputCode}
                                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                                    className="w-full bg-zinc-100 dark:bg-zinc-800 border-2 border-transparent focus:border-red-500 rounded-2xl pl-12 pr-4 py-4 font-mono font-bold tracking-widest text-lg outline-none transition-all"
                                />
                            </div>
                            <Button
                                onClick={handleVerifyCode}
                                disabled={isVerifying || !inputCode.trim()}
                                className="w-full h-14 rounded-2xl text-lg font-bold bg-red-600 hover:bg-red-700 shadow-xl shadow-red-500/20"
                            >
                                {isVerifying ? "Đang kiểm tra..." : "Xác nhận truy cập"}
                            </Button>
                        </div>
                    </Card>
                </main>
            </div>
        );
    }

    const renderStartGate = () => (
        <Card className="max-w-md mx-auto p-8 text-center space-y-6 shadow-2xl border-indigo-500/20 animate-scale-in">
            <div className="h-20 w-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <PlayCircle className="h-10 w-10 text-indigo-600" />
            </div>
            <div>
                <h2 className="text-2xl font-black mb-2">{language === 'vi' ? 'Bạn đã sẵn sàng chưa?' : 'Are you ready?'}</h2>
                <p className="text-[rgb(var(--muted-foreground))] leading-relaxed">
                    {language === 'vi'
                        ? `Bài trắc nghiệm "${quiz.title}" đang chờ bạn chinh phục. Bạn sẽ biết ngay kết quả sau mỗi câu trả lời!`
                        : `The quiz "${quiz.title}" is waiting for you. You will see the results after each answer!`
                    }
                </p>
            </div>
            <div className="flex flex-col gap-3">
                <Button
                    size="lg"
                    className="w-full rounded-full py-6 text-lg font-bold shadow-lg shadow-indigo-500/40 hover:scale-[1.02] transition-transform"
                    onClick={() => setIsReadyToStart(true)}
                >
                    {language === 'vi' ? 'Làm bài ngay!' : 'Start Now!'}
                </Button>
                <Button
                    size="lg"
                    variant="outline"
                    className="w-full rounded-full py-6 text-lg font-bold border-2 border-indigo-100 hover:border-indigo-500 hover:text-indigo-600 transition-all gap-2"
                    onClick={() => router.push(`/courses/${id}/flashcards`)}
                >
                    <Layers className="h-5 w-5" />
                    {t.flashcards.study}
                </Button>
            </div>
        </Card>
    );

    return (
        <div className="min-h-screen bg-[rgb(var(--background))]">
            <Navbar />
            <main className="pt-32 px-6 max-w-4xl mx-auto pb-20">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold mb-2">{quiz.title}</h1>
                    <p className="text-[rgb(var(--muted-foreground))]">{quiz.description}</p>
                </div>

                {!hasAccess ? (
                    <Card className="max-w-md mx-auto p-6 text-center space-y-6">
                        <div>
                            <h2 className="text-xl font-semibold mb-2">Ready to start?</h2>
                            <p className="text-sm text-[rgb(var(--muted-foreground))]">Please login or enter your name to continue.</p>
                        </div>

                        <div className="space-y-3">
                            <Button onClick={() => login()} className="w-full" variant="outline">
                                Login with Google
                            </Button>
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-[rgb(var(--border))]" /></div>
                                <div className="relative flex justify-center text-xs uppercase"><span className="bg-[rgb(var(--card))] px-2 text-[rgb(var(--muted-foreground))]">Or join as guest</span></div>
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Enter your name"
                                    value={tempName}
                                    onChange={(e) => setTempName(e.target.value)}
                                />
                                <Button onClick={handleJoinAsGuest} disabled={!tempName.trim()}>
                                    Join
                                </Button>
                            </div>
                        </div>
                    </Card>
                ) : !isReadyToStart ? (
                    renderStartGate()
                ) : (
                    <div className="space-y-6 animation-fade-in">
                        {/* Header Info */}
                        <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg sticky top-20 z-10 backdrop-blur-md shadow-sm">
                            <span className="font-medium">{language === 'vi' ? 'Người chơi' : 'Player'}: <span className="font-bold text-indigo-600 dark:text-indigo-400">{user ? user.displayName : guestName}</span></span>

                            <div className="flex items-center gap-4">
                                <span className={`font-mono text-xl font-bold ${isSubmitted ? 'text-green-600' : 'text-indigo-600'}`}>
                                    {isSubmitted ? formatTime(finalTimeMs, language) : formatTime(elapsedTime, language)}
                                </span>
                                {!isSubmitted && (
                                    <span className="text-sm text-[rgb(var(--muted-foreground))]">
                                        {Object.keys(revealed).length} / {quiz.questions.length}
                                    </span>
                                )}
                            </div>
                        </div>

                        {isSubmitted && (
                            <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-2xl p-8 mb-8 animation-scale-in">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="h-16 w-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center animate-bounce">
                                        <Trophy className="h-8 w-8" />
                                    </div>
                                    <h2 className="text-2xl font-bold">{language === 'vi' ? 'Đã hoàn thành!' : 'Quiz Completed!'}</h2>
                                    <p className="text-[rgb(var(--muted-foreground))]">{language === 'vi' ? 'Thời gian' : 'Time'}: {formatTime(finalTimeMs, language)}</p>
                                    <ScorePath score={score} total={quiz.questions.length} language={language} />

                                    <Leaderboard quizId={quiz.id!} language={language} />

                                    <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
                                        {language === 'vi' ? 'Làm lại' : 'Retake Quiz'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Questions List */}
                        {quiz.questions?.map((q, i) => {
                            const userAns = answers[i];
                            const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer || ""];
                            let isCorrect = false;

                            if (q.type === 'multiple') {
                                isCorrect = arraysEqual(userAns as string[], correctArr);
                            } else if (q.type === 'single') {
                                isCorrect = correctArr.includes(userAns as string);
                            } else {
                                isCorrect = (userAns as string || "").trim().toLowerCase() === (correctArr[0] as string || "").trim().toLowerCase();
                            }

                            return (
                                <QuestionTaker
                                    key={i}
                                    index={i}
                                    question={q}
                                    selected={answers[i]}
                                    onChange={(val) => handleAnswer(i, val)}
                                    readOnly={isSubmitted}
                                    isRevealed={revealed[i]}
                                    isCorrect={isCorrect}
                                    onCheck={() => handleCheckIndividual(i)}
                                    language={language}
                                />
                            );
                        })}

                        {!isSubmitted && (
                            <div className="flex justify-center pt-8 pb-20">
                                <Button
                                    size="lg"
                                    className="rounded-full px-12 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1"
                                    onClick={onPreSubmit}
                                >
                                    {language === 'vi' ? 'Nộp kết quả cuối cùng' : 'Submit Final Result'}
                                </Button>
                            </div>
                        )}

                        <ConfirmDialog
                            isOpen={confirmOpen}
                            title={language === 'vi' ? "Nộp bài?" : "Submit Quiz?"}
                            description={unansweredCount > 0
                                ? (language === 'vi' ? `Bạn còn ${unansweredCount} câu chưa hoàn thành. Bạn có chắc chắn muốn kết thúc?` : `You have ${unansweredCount} unanswered questions. Are you sure you want to exit?`)
                                : (language === 'vi' ? "Bạn có chắc chắn muốn hoàn thành bài trắc nghiệm?" : "Are you sure you want to finish the quiz?")
                            }
                            confirmText={language === 'vi' ? "Nộp bài" : "Submit"}
                            variant={unansweredCount > 0 ? 'danger' : 'info'}
                            onConfirm={handleSubmit}
                            onCancel={() => setConfirmOpen(false)}
                        />
                    </div>
                )}
            </main>
        </div>
    );
}
