"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getQuizzes, QuizData } from "@/services/quizService";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ArrowRight, BookOpen, Info, Search, Key, Sparkles, Filter, ChevronDown, ChevronUp, Share2, X, Trophy, Zap } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { CourseDetailsModal } from "@/components/quiz/CourseDetailsModal";
import { getQuizByAccessCode } from "@/services/quizService";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function CoursesPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[rgb(var(--background))] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-600"></div>
            </div>
        }>
            <CoursesContent />
        </Suspense>
    );
}

function CoursesContent() {
    const { t, language } = useLanguage();
    const [quizzes, setQuizzes] = useState<QuizData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuiz, setSelectedQuiz] = useState<QuizData | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [joinCode, setJoinCode] = useState("");
    const [isJoining, setIsJoining] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const subjectParam = searchParams.get("subject");
        if (subjectParam) {
            setSelectedSubject(subjectParam);
        }
    }, [searchParams]);

    const handleShareSubject = (subject: string) => {
        const url = `${window.location.origin}/courses?subject=${encodeURIComponent(subject)}`;
        navigator.clipboard.writeText(url);
        toast.success(language === 'vi' ? `Đã sao chép liên kết môn ${subject}!` : `${subject} subject link copied!`);
    };

    const toggleSubject = (subject: string) => {
        setExpandedSubjects(prev => ({
            ...prev,
            [subject]: prev[subject] === false ? true : false
        }));
    };

    const handleShare = (quizId: string) => {
        const url = `${window.location.origin}/courses/${quizId}`;
        navigator.clipboard.writeText(url);
        toast.success(language === 'vi' ? "Đã sao chép liên kết khóa học!" : "Course link copied!");
    };

    useEffect(() => {
        async function fetch() {
            try {
                const data = await getQuizzes();
                setQuizzes(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetch();
    }, []);

    const filteredQuizzes = quizzes.filter(q => {
        const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            q.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSubject = !selectedSubject || q.subject === selectedSubject;
        return matchesSearch && matchesSubject;
    });

    const handleJoinWithCode = async () => {
        if (!joinCode.trim()) return;
        setIsJoining(true);
        try {
            const quiz = await getQuizByAccessCode(joinCode.trim());
            if (quiz) {
                toast.success(`${language === 'vi' ? 'Tìm thấy khóa học' : 'Course found'}: ${quiz.title}`);
                router.push(`/courses/${quiz.id}?code=${joinCode.trim().toUpperCase()}`);
            } else {
                toast.error(language === 'vi' ? "Mã truy cập không hợp lệ hoặc không tồn tại." : "Invalid or non-existent access code.");
            }
        } catch (error) {
            toast.error(language === 'vi' ? "Lỗi khi kiểm tra mã truy cập." : "Error verifying access code.");
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <div className="min-h-screen bg-[rgb(var(--background))]">
            <Navbar />
            <main className="pt-32 px-6 max-w-7xl mx-auto pb-20">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sky-500 font-bold text-sm uppercase tracking-widest">
                            <Sparkles className="h-4 w-4" /> {language === 'vi' ? 'Khám phá tri thức' : 'Discover Knowledge'}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
                            {t.navbar.allCourses}
                        </h1>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center">
                        {selectedSubject && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-2xl border border-sky-100 dark:border-sky-800 text-sm font-bold">
                                <span>{language === 'vi' ? 'Môn học' : 'Subject'}: {selectedSubject}</span>
                                <button onClick={() => setSelectedSubject(null)} className="hover:text-sky-800 dark:hover:text-sky-200">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                        <div className="relative group flex-1 sm:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-sky-500 transition-colors" />
                            <input
                                placeholder={language === 'vi' ? "Tìm kiếm khóa học..." : "Search courses..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-12 pl-12 pr-4 bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 focus:border-sky-500 rounded-2xl text-sm outline-none transition-all shadow-sm"
                            />
                        </div>
                        
                        <div className="relative flex-1 sm:w-64 flex gap-2">
                            <div className="relative flex-1">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                                <input
                                    placeholder={t.visibility.accessCode + "..."}
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                    className="w-full h-12 pl-12 pr-4 bg-sky-50 dark:bg-sky-950/20 border-2 border-sky-100 dark:border-sky-900/30 focus:border-sky-500 rounded-2xl text-sm outline-none transition-all"
                                />
                            </div>
                            <Button 
                                disabled={isJoining || !joinCode}
                                onClick={handleJoinWithCode}
                                className="h-12 px-6 rounded-2xl bg-sky-600 hover:bg-sky-700 shadow-lg shadow-sky-500/20"
                            >
                                {isJoining ? "..." : (language === 'vi' ? "Vào" : "Join")}
                            </Button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-64 rounded-3xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <>
                        {filteredQuizzes.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center py-32 bg-zinc-50 dark:bg-zinc-900/50 rounded-[3rem] border-2 border-dashed border-zinc-100 dark:border-zinc-800"
                            >
                                <div className="mx-auto w-20 h-20 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 rounded-3xl flex items-center justify-center mb-6">
                                    <Filter className="h-10 w-10" />
                                </div>
                                <h3 className="text-xl font-bold mb-2 text-zinc-900 dark:text-zinc-50">
                                    {language === 'vi' ? 'Không tìm thấy khóa học nào' : 'No courses found'}
                                </h3>
                                <p className="text-zinc-500 max-w-xs mx-auto">
                                    {language === 'vi' ? 'Hãy thử thay đổi từ khóa tìm kiếm hoặc kiểm tra lại mã truy cập riêng tư của bạn.' : 'Try changing your search keywords or checking your private access code.'}
                                </p>
                                <Button 
                                    variant="ghost" 
                                    className="mt-6 text-sky-600 font-bold"
                                    onClick={() => { setSearchQuery(""); setJoinCode(""); }}
                                >
                                    {language === 'vi' ? 'Xóa tất cả lọc' : 'Clear all filters'}
                                </Button>
                            </motion.div>
                        ) : (
                            <div className="space-y-20">
                                {Object.entries(
                                    filteredQuizzes.reduce((acc, quiz) => {
                                        const subject = quiz.subject?.trim() || (language === 'vi' ? "Khác" : "Others");
                                        if (!acc[subject]) acc[subject] = [];
                                        acc[subject].push(quiz);
                                        return acc;
                                    }, {} as Record<string, QuizData[]>)
                                ).map(([subject, rawQuizzes]) => {
                                    const subjectQuizzes = [...rawQuizzes].sort((a, b) => {
                                        const aVal = a.chapter !== undefined && a.chapter !== null && (a.chapter as any) !== "" ? Number(a.chapter) : Infinity;
                                        const bVal = b.chapter !== undefined && b.chapter !== null && (b.chapter as any) !== "" ? Number(b.chapter) : Infinity;
                                        if (aVal === bVal) {
                                            return (a.title || "").localeCompare(b.title || "");
                                        }
                                        return aVal - bVal;
                                    });
                                    const isExpanded = expandedSubjects[subject] !== false;
                                    return (
                                        <div key={subject} className="space-y-10">
                                            <div 
                                                className="flex items-center justify-between group/header cursor-pointer"
                                                onClick={() => toggleSubject(subject)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-1.5 bg-sky-600 rounded-full" />
                                                    <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
                                                        <BookOpen className="h-6 w-6 text-sky-500" />
                                                        {subject}
                                                        <span className="text-sm font-bold px-3 py-1 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-xl ml-2">
                                                            {subjectQuizzes.length}
                                                        </span>
                                                    </h2>
                                                </div>
                                                <div className="flex items-center gap-1 sm:gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="rounded-full px-2 sm:px-4 border-sky-200 text-sky-600 hover:bg-sky-50 font-bold flex gap-1 sm:gap-2"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/practice/${encodeURIComponent(subject)}`);
                                                        }}
                                                    >
                                                        <Zap className="h-4 w-4 text-yellow-500" />
                                                        <span className="hidden xs:inline">{language === 'vi' ? 'Luyện tập' : 'Practice'}</span>
                                                        <span className="xs:hidden">{language === 'vi' ? 'Luyện' : 'Prac'}</span>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="rounded-full px-2 sm:px-4 border-sky-200 text-sky-600 hover:bg-sky-50 font-bold flex gap-1 sm:gap-2"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/mock-exam/${encodeURIComponent(subject)}`);
                                                        }}
                                                    >
                                                        <Trophy className="h-4 w-4" />
                                                        <span className="hidden xs:inline">{language === 'vi' ? 'Thi thử' : 'Mock'}</span>
                                                        <span className="xs:hidden">{language === 'vi' ? 'Thi' : 'Exam'}</span>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 sm:h-10 sm:w-10 text-sky-500 hover:text-sky-600 hover:bg-sky-50 rounded-full"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleShareSubject(subject);
                                                        }}
                                                    >
                                                        <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 sm:h-12 sm:w-12 p-0 text-zinc-400 group-hover/header:bg-sky-50 group-hover/header:text-sky-600 transition-colors">
                                                        {isExpanded ? <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6" /> : <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6" />}
                                                    </Button>
                                                </div>
                                            </div>

                                            <AnimatePresence initial={false}>
                                                {isExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 py-2">
                                                            <AnimatePresence mode="popLayout">
                                                                {subjectQuizzes.map(quiz => (
                                                                    <motion.div
                                                                        key={quiz.id}
                                                                        layout
                                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                                        animate={{ opacity: 1, scale: 1 }}
                                                                        exit={{ opacity: 0, scale: 0.9 }}
                                                                    >
                                                                        <Card className="h-full border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden group hover:ring-2 ring-sky-500 transition-all duration-300">
                                                                            <CardHeader className="p-8 pb-4">
                                                                                <div className="flex justify-between items-start mb-6">
                                                                                    <div className="w-14 h-14 bg-sky-50 dark:bg-sky-900/30 text-sky-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                                                                        <BookOpen className="h-7 w-7" />
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="icon"
                                                                                            className="h-9 w-9 text-sky-500 hover:text-sky-600 hover:bg-sky-50 rounded-full"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                quiz.id && handleShare(quiz.id);
                                                                                            }}
                                                                                        >
                                                                                            <Share2 className="h-4 w-4" />
                                                                                        </Button>
                                                                                        <div className="px-3 py-1 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                                                            {quiz.questions?.length || 0} {language === 'vi' ? 'CÂU HỎI' : 'QUESTIONS'}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                {quiz.chapter !== undefined && quiz.chapter !== null && (quiz.chapter as any) !== "" && (
                                                                                    <div className="text-xs font-extrabold text-sky-600 dark:text-sky-400 mb-2 flex items-center gap-1.5">
                                                                                        <span className="px-2 py-0.5 bg-sky-50 dark:bg-sky-950/40 rounded-md border border-sky-100/50 dark:border-sky-900/30">
                                                                                            {language === 'vi' ? `Chương ${quiz.chapter}` : `Chapter ${quiz.chapter}`}
                                                                                        </span>
                                                                                        {quiz.chapterName && <span className="truncate max-w-[150px]">— {quiz.chapterName}</span>}
                                                                                    </div>
                                                                                )}
                                                                                <CardTitle className="text-xl font-bold line-clamp-2 leading-tight min-h-[56px] group-hover:text-sky-600 transition-colors">
                                                                                    {quiz.title}
                                                                                </CardTitle>
                                                                            </CardHeader>
                                                                            <CardContent className="px-8 pt-0 flex-1">
                                                                                <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-3 leading-relaxed mb-6">
                                                                                    {quiz.description || (language === 'vi' ? "Khóa học này chưa có mô tả chi tiết từ tác giả." : "This course doesn't have a detailed description yet.")}
                                                                                </p>
                                                                                <div className="flex items-center gap-2 mb-4">
                                                                                    <div className="h-6 w-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold">
                                                                                        {quiz.authorName?.[0] || 'A'}
                                                                                    </div>
                                                                                    <span className="text-xs text-zinc-400 font-medium">{language === 'vi' ? 'Tác giả' : 'Author'}: {quiz.authorName || (language === 'vi' ? "Ẩn danh" : "Anonymous")}</span>
                                                                                </div>
                                                                            </CardContent>
                                                                            <CardFooter className="p-8 pt-0 flex gap-3">
                                                                                <Button
                                                                                    variant="secondary"
                                                                                    className="flex-1 h-12 rounded-2xl font-bold"
                                                                                    onClick={() => {
                                                                                        setSelectedQuiz(quiz);
                                                                                        setIsDetailsOpen(true);
                                                                                    }}
                                                                                >
                                                                                    {t.common.details}
                                                                                </Button>
                                                                                <Link href={`/courses/${quiz.id}`} className="flex-[1.5]">
                                                                                    <Button className="w-full h-12 gap-2 rounded-2xl bg-sky-600 hover:bg-sky-700 font-bold shadow-lg shadow-sky-500/20">
                                                                                        {language === 'vi' ? 'Làm bài' : 'Start'} <ArrowRight className="h-4 w-4" />
                                                                                    </Button>
                                                                                </Link>
                                                                            </CardFooter>
                                                                        </Card>
                                                                    </motion.div>
                                                                ))}
                                                            </AnimatePresence>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                <CourseDetailsModal
                    isOpen={isDetailsOpen}
                    onClose={() => {
                        setIsDetailsOpen(false);
                        setSelectedQuiz(null);
                    }}
                    quiz={selectedQuiz}
                />
            </main>
        </div>
    );
}
