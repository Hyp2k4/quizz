"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getQuizzes, QuizData } from "@/services/quizService";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ArrowRight, BookOpen, Info, Search, Key, Sparkles, Filter } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { CourseDetailsModal } from "@/components/quiz/CourseDetailsModal";
import { getQuizByAccessCode } from "@/services/quizService";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function CoursesPage() {
    const { t } = useLanguage();
    const [quizzes, setQuizzes] = useState<QuizData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuiz, setSelectedQuiz] = useState<QuizData | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [joinCode, setJoinCode] = useState("");
    const [isJoining, setIsJoining] = useState(false);
    const router = useRouter();

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

    const filteredQuizzes = quizzes.filter(q => 
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleJoinWithCode = async () => {
        if (!joinCode.trim()) return;
        setIsJoining(true);
        try {
            const quiz = await getQuizByAccessCode(joinCode.trim());
            if (quiz) {
                toast.success(`Tìm thấy khóa học: ${quiz.title}`);
                router.push(`/courses/${quiz.id}?code=${joinCode.trim().toUpperCase()}`);
            } else {
                toast.error("Mã truy cập không hợp lệ hoặc không tồn tại.");
            }
        } catch (error) {
            toast.error("Lỗi khi kiểm tra mã truy cập.");
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
                        <div className="flex items-center gap-2 text-indigo-500 font-bold text-sm uppercase tracking-widest">
                            <Sparkles className="h-4 w-4" /> Khám phá tri thức
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
                            {t.navbar.allCourses}
                        </h1>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <div className="relative group flex-1 sm:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input
                                placeholder="Tìm kiếm khóa học..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-12 pl-12 pr-4 bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 focus:border-indigo-500 rounded-2xl text-sm outline-none transition-all shadow-sm"
                            />
                        </div>
                        
                        <div className="relative flex-1 sm:w-64 flex gap-2">
                            <div className="relative flex-1">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                                <input
                                    placeholder="Mã riêng tư..."
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                    className="w-full h-12 pl-12 pr-4 bg-indigo-50 dark:bg-indigo-950/20 border-2 border-indigo-100 dark:border-indigo-900/30 focus:border-indigo-500 rounded-2xl text-sm outline-none transition-all"
                                />
                            </div>
                            <Button 
                                disabled={isJoining || !joinCode}
                                onClick={handleJoinWithCode}
                                className="h-12 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"
                            >
                                {isJoining ? "..." : "Vào"}
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
                                <h3 className="text-xl font-bold mb-2 text-zinc-900 dark:text-zinc-50">Không tìm thấy khóa học nào</h3>
                                <p className="text-zinc-500 max-w-xs mx-auto">Hãy thử thay đổi từ khóa tìm kiếm hoặc kiểm tra lại mã truy cập riêng tư của bạn.</p>
                                <Button 
                                    variant="ghost" 
                                    className="mt-6 text-indigo-600 font-bold"
                                    onClick={() => { setSearchQuery(""); setJoinCode(""); }}
                                >
                                    Xóa tất cả lọc
                                </Button>
                            </motion.div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                <AnimatePresence mode="popLayout">
                                    {filteredQuizzes.map(quiz => (
                                        <motion.div
                                            key={quiz.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                        >
                                            <Card className="h-full border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden group hover:ring-2 ring-indigo-500 transition-all duration-300">
                                                <CardHeader className="p-8 pb-4">
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                                            <BookOpen className="h-7 w-7" />
                                                        </div>
                                                        <div className="px-3 py-1 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                            {quiz.questions?.length || 0} CÂU HỎI
                                                        </div>
                                                    </div>
                                                    <CardTitle className="text-xl font-bold line-clamp-2 leading-tight min-h-[56px] group-hover:text-indigo-600 transition-colors">
                                                        {quiz.title}
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="px-8 pt-0 flex-1">
                                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-3 leading-relaxed mb-6">
                                                        {quiz.description || "Khóa học này chưa có mô tả chi tiết từ tác giả."}
                                                    </p>
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <div className="h-6 w-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold">
                                                            {quiz.authorName?.[0] || 'A'}
                                                        </div>
                                                        <span className="text-xs text-zinc-400 font-medium">Tác giả: {quiz.authorName || "Ẩn danh"}</span>
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
                                                        Chi tiết
                                                    </Button>
                                                    <Link href={`/courses/${quiz.id}`} className="flex-[1.5]">
                                                        <Button className="w-full h-12 gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-500/20">
                                                            Làm bài <ArrowRight className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                </CardFooter>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
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
