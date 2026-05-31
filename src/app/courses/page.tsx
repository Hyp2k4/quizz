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
    const [modalSubject, setModalSubject] = useState<{subject: string, quizzes: QuizData[]} | null>(null);
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
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                    {Object.entries(
                                        filteredQuizzes.reduce((acc, quiz) => {
                                            const subject = quiz.subject?.trim() || (language === 'vi' ? "Khác" : "Others");
                                            if (!acc[subject]) acc[subject] = [];
                                            acc[subject].push(quiz);
                                            return acc;
                                        }, {} as Record<string, QuizData[]>)
                                    ).map(([subject, rawQuizzes]) => {
                                        // Use the first quiz's image or generate a deterministic random image for each subject
                                        const imageUrl = rawQuizzes[0]?.imageUrl || `https://picsum.photos/seed/${encodeURIComponent(subject)}/600/400`;
                                        return (
                                            <div
                                                key={subject}
                                                onClick={() => setModalSubject({ subject, quizzes: rawQuizzes })}
                                                className="group relative h-48 sm:h-56 w-full rounded-3xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl hover:ring-4 ring-sky-500/50 transition-all hover:-translate-y-1.5"
                                            >
                                                {/* Background Image */}
                                                <div 
                                                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                                                    style={{ backgroundImage: `url('${imageUrl}')` }}
                                                />
                                                {/* Gradient Overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 group-hover:from-black/80 transition-colors duration-300" />
                                                
                                                {/* Content */}
                                                <div className="absolute inset-0 p-6 flex flex-col justify-end items-start text-left z-10">
                                                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center mb-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-xl">
                                                        <BookOpen className="h-6 w-6" />
                                                    </div>
                                                    
                                                    <h3 className="text-2xl font-black text-white line-clamp-2 leading-tight mb-2 drop-shadow-md">
                                                        {subject}
                                                    </h3>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-sky-100 bg-sky-600/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
                                                            {rawQuizzes.length} {language === 'vi' ? 'chương/đề' : 'chapters'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <AnimatePresence>
                                    {modalSubject && (
                                        <motion.div
                                            className="fixed inset-0 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            onClick={() => setModalSubject(null)}
                                        >
                                            <motion.div
                                                className="bg-white dark:bg-zinc-900 w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border dark:border-zinc-800 relative"
                                                initial={{ scale: 0.95, y: 20 }}
                                                animate={{ scale: 1, y: 0 }}
                                                exit={{ scale: 0.95, y: 20 }}
                                                onClick={e => e.stopPropagation()}
                                            >
                                                {/* Header */}
                                                <div className="p-6 md:p-8 border-b dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50 sticky top-0 z-10">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-12 w-1.5 bg-sky-600 rounded-full" />
                                                        <div>
                                                            <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-50 mb-1">{modalSubject.subject}</h2>
                                                            <p className="text-sm font-medium text-zinc-500">
                                                                {modalSubject.quizzes.length} {language === 'vi' ? 'chương/đề được tìm thấy' : 'chapters found'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 h-10 w-10 shrink-0"
                                                            onClick={() => setModalSubject(null)}
                                                        >
                                                            <X className="h-5 w-5" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="px-6 md:px-8 py-4 border-b dark:border-zinc-800 flex flex-wrap gap-3 bg-white dark:bg-zinc-900 z-10">
                                                    <Button
                                                        onClick={() => router.push(`/practice/${encodeURIComponent(modalSubject.subject)}`)}
                                                        className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-sm gap-2 h-11 px-6"
                                                    >
                                                        <Zap className="h-5 w-5 text-yellow-300" />
                                                        <span className="font-bold">{language === 'vi' ? 'Luyện tập tổng hợp' : 'Practice All'}</span>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => router.push(`/mock-exam/${encodeURIComponent(modalSubject.subject)}`)}
                                                        className="rounded-xl gap-2 border-sky-200 text-sky-600 hover:bg-sky-50 h-11 px-6"
                                                    >
                                                        <Trophy className="h-5 w-5" />
                                                        <span className="font-bold">{language === 'vi' ? 'Thi thử toàn môn' : 'Full Mock Exam'}</span>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => handleShareSubject(modalSubject.subject)}
                                                        className="rounded-xl gap-2 text-zinc-500 hover:text-sky-600 hover:bg-sky-50 h-11"
                                                    >
                                                        <Share2 className="h-5 w-5" />
                                                        <span className="hidden sm:inline font-bold">{language === 'vi' ? 'Chia sẻ' : 'Share'}</span>
                                                    </Button>
                                                </div>

                                                {/* Body */}
                                                <div className="p-6 md:p-8 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950/50 flex-1">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                        {[...modalSubject.quizzes].sort((a, b) => {
                                                            const aVal = a.chapter !== undefined && a.chapter !== null && (a.chapter as any) !== "" ? Number(a.chapter) : Infinity;
                                                            const bVal = b.chapter !== undefined && b.chapter !== null && (b.chapter as any) !== "" ? Number(b.chapter) : Infinity;
                                                            if (aVal === bVal) return (a.title || "").localeCompare(b.title || "");
                                                            return aVal - bVal;
                                                        }).map(quiz => (
                                                            <Card key={quiz.id} className="border-none shadow-md hover:shadow-xl transition-all duration-300 bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden group hover:ring-2 ring-sky-500/50 flex flex-col relative">
                                                                {/* Course Thumbnail */}
                                                                <div 
                                                                    className="h-32 w-full bg-cover bg-center relative"
                                                                    style={{ backgroundImage: `url('${quiz.imageUrl || `https://picsum.photos/seed/${quiz.id || encodeURIComponent(quiz.title)}/400/200`}')` }}
                                                                >
                                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                                                    <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
                                                                        {quiz.chapter !== undefined && quiz.chapter !== null && (quiz.chapter as any) !== "" && (
                                                                            <span className="px-3 py-1 bg-sky-500/90 backdrop-blur-sm text-white text-xs font-black rounded-lg shadow-sm">
                                                                                {language === 'vi' ? 'CHƯƠNG' : 'CH'} {quiz.chapter}
                                                                            </span>
                                                                        )}
                                                                        <span className="px-3 py-1 bg-zinc-900/80 backdrop-blur-sm text-white text-xs font-bold rounded-lg ml-auto shadow-sm">
                                                                            {quiz.questions?.length || 0} {language === 'vi' ? 'CÂU' : 'QS'}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <div className="p-5 flex-1 flex flex-col">
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <h3 className="font-bold text-lg line-clamp-2 leading-snug group-hover:text-sky-600 transition-colors">
                                                                            {quiz.title}
                                                                        </h3>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-zinc-400 hover:text-sky-600 hover:bg-sky-50 rounded-full shrink-0 -mt-1 -mr-1"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                quiz.id && handleShare(quiz.id);
                                                                            }}
                                                                        >
                                                                            <Share2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                    <p className="text-sm text-zinc-500 line-clamp-2 mb-4 flex-1">
                                                                        {quiz.description || (language === 'vi' ? "Không có mô tả" : "No description")}
                                                                    </p>
                                                                    <div className="flex gap-2 mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                                                                        <Button 
                                                                            variant="secondary" 
                                                                            className="flex-1 rounded-xl text-sm h-10 font-bold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                                                                            onClick={() => {
                                                                                setSelectedQuiz(quiz);
                                                                                setIsDetailsOpen(true);
                                                                            }}
                                                                        >
                                                                            {t.common.details}
                                                                        </Button>
                                                                        <Link href={`/courses/${quiz.id}`} className="flex-[1.5]">
                                                                            <Button className="w-full rounded-xl text-sm h-10 bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-md shadow-sky-500/20">
                                                                                {language === 'vi' ? 'Làm bài' : 'Start'}
                                                                            </Button>
                                                                        </Link>
                                                                    </div>
                                                                </div>
                                                            </Card>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </>
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
