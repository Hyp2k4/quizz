"use client";

import { useEffect, useState, Suspense } from "react";
import { getUserQuizResults, QuizResult } from "@/services/quizService";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BookOpen, ChevronRight, CheckCircle, XCircle, Trophy, RotateCcw, Filter, Search, ArrowRight, Layers } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export default function ReviewPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[rgb(var(--background))] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        }>
            <ReviewContent />
        </Suspense>
    );
}

function ReviewContent() {
    const { user, loading: authLoading } = useAuth();
    const { language, t } = useLanguage();
    const [results, setResults] = useState<QuizResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/");
            return;
        }

        async function fetch() {
            if (!user) return;
            try {
                const data = await getUserQuizResults(user.uid);
                // Filter only results that have wrong questions
                const withWrongs = data.filter(r => r.wrongQuestions && r.wrongQuestions.length > 0);
                setResults(withWrongs);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }

        if (user) fetch();
    }, [user, authLoading, router]);

    // Grouping logic
    const groupedBySubject = results.reduce((acc, res) => {
        const subject = res.subject?.trim() || (language === 'vi' ? "Khác" : "Others");
        if (!acc[subject]) acc[subject] = [];
        acc[subject].push(res);
        return acc;
    }, {} as Record<string, QuizResult[]>);

    const filteredGroups = Object.entries(groupedBySubject).map(([subject, subjectResults]) => {
        const filtered = subjectResults.filter(r => 
            r.quizTitle?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return [subject, filtered] as [string, QuizResult[]];
    }).filter(([_, results]) => results.length > 0);

    return (
        <div className="min-h-screen bg-[rgb(var(--background))]">
            <Navbar />
            <main className="pt-32 px-6 max-w-7xl mx-auto pb-20">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-red-500 font-bold text-sm uppercase tracking-widest">
                            <XCircle className="h-4 w-4" /> {language === 'vi' ? 'Ôn tập câu sai' : 'Review Errors'}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
                            {language === 'vi' ? 'Luyện tập mục tiêu' : 'Targeted Practice'}
                        </h1>
                        <p className="text-zinc-500 max-w-xl">
                            {language === 'vi' 
                                ? 'Danh sách các câu hỏi bạn đã làm sai được phân loại theo môn học. Hãy chinh phục lại chúng!' 
                                : 'List of questions you answered incorrectly, categorized by subject. Conquer them again!'}
                        </p>
                    </div>

                    <div className="relative group w-full md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            placeholder={language === 'vi' ? "Tìm bài tập..." : "Search quizzes..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-12 pl-12 pr-4 bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 focus:border-indigo-500 rounded-2xl text-sm outline-none transition-all shadow-sm"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-64 rounded-[2.5rem] bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                        ))}
                    </div>
                ) : results.length === 0 ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-32 bg-zinc-50 dark:bg-zinc-900/50 rounded-[3rem] border-2 border-dashed border-zinc-100 dark:border-zinc-800"
                    >
                        <div className="mx-auto w-20 h-20 bg-green-50 dark:bg-green-900/20 text-green-500 rounded-3xl flex items-center justify-center mb-6">
                            <CheckCircle className="h-10 w-10" />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-zinc-900 dark:text-zinc-50">
                            {language === 'vi' ? 'Tuyệt vời! Bạn không có câu sai nào' : 'Great! No errors found'}
                        </h3>
                        <p className="text-zinc-500 max-w-xs mx-auto">
                            {language === 'vi' ? 'Bạn đã hoàn thành rất tốt các bài tập. Hãy tiếp tục duy trì phong độ này nhé!' : 'You have done a great job on your quizzes. Keep up the good work!'}
                        </p>
                        <Link href="/courses">
                            <Button className="mt-8 rounded-2xl bg-indigo-600 px-8">
                                {language === 'vi' ? 'Khám phá thêm' : 'Explore More'}
                            </Button>
                        </Link>
                    </motion.div>
                ) : (
                    <div className="space-y-16">
                        {filteredGroups.map(([subject, subjectResults]) => (
                            <div key={subject} className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-1.5 bg-red-500 rounded-full" />
                                    <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
                                        <BookOpen className="h-6 w-6 text-red-500" />
                                        {subject}
                                        <span className="text-sm font-bold px-3 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl ml-2">
                                            {subjectResults.length} {language === 'vi' ? 'Bài' : 'Quizzes'}
                                        </span>
                                    </h2>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {subjectResults.map((result, idx) => (
                                        <motion.div
                                            key={`${result.id}-${idx}`}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: idx * 0.05 }}
                                        >
                                            <Card className="h-full border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden group hover:ring-2 ring-red-500 transition-all duration-300">
                                                <CardHeader className="p-8 pb-4">
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div className="w-14 h-14 bg-red-50 dark:bg-red-900/30 text-red-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                                            <XCircle className="h-7 w-7" />
                                                        </div>
                                                        <div className="px-3 py-1 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                            {result.wrongQuestions?.length || 0} {language === 'vi' ? 'CÂU SAI' : 'WRONG'}
                                                        </div>
                                                    </div>
                                                    <CardTitle className="text-xl font-bold line-clamp-2 leading-tight min-h-[56px] group-hover:text-red-600 transition-colors">
                                                        {result.quizTitle || "Untitled Quiz"}
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="px-8 pt-0 flex-1">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                                                            <div className="text-xs text-zinc-400 font-bold uppercase tracking-widest">{language === 'vi' ? 'Điểm cũ' : 'Old Score'}</div>
                                                            <div className="text-sm font-black">{result.score} / {result.totalQuestions}</div>
                                                        </div>
                                                        <p className="text-xs text-zinc-400">
                                                            {language === 'vi' ? 'Hoàn thành ngày' : 'Completed on'}: {new Date(result.createdAt?.seconds * 1000).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}
                                                        </p>
                                                    </div>
                                                </CardContent>
                                                <CardFooter className="p-8 pt-0">
                                                    <Link href={`/courses/${result.quizId}`} className="w-full">
                                                        <Button className="w-full h-12 gap-2 rounded-2xl bg-red-600 hover:bg-red-700 font-bold shadow-lg shadow-red-500/20">
                                                            <RotateCcw className="h-4 w-4" />
                                                            {language === 'vi' ? 'Làm lại ngay' : 'Retake Now'}
                                                        </Button>
                                                    </Link>
                                                </CardFooter>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
