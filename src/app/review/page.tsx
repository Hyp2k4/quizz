"use client";

import { useEffect, useState, Suspense } from "react";
import { getUserQuizResults, QuizResult, getSubjectWrongQuestions } from "@/services/quizService";
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
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-600"></div>
            </div>
        }>
            <ReviewContent />
        </Suspense>
    );
}

function ReviewContent() {
    const { user, loading: authLoading } = useAuth();
    const { language, t } = useLanguage();
    const [subjectGroups, setSubjectGroups] = useState<{ subject: string; questions: any[] }[]>([]);
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
                setLoading(true);
                const quizResults = await getUserQuizResults(user.uid);
                const uniqueSubjects = Array.from(new Set(quizResults.map(r => r.subject).filter(Boolean) as string[]));
                
                const subjectsData: { subject: string; questions: any[] }[] = [];
                for (const subj of uniqueSubjects) {
                    const wrongQs = await getSubjectWrongQuestions(user.uid, subj);
                    if (wrongQs.length > 0) {
                        subjectsData.push({
                            subject: subj,
                            questions: wrongQs
                        });
                    }
                }
                setSubjectGroups(subjectsData);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }

        if (user) fetch();
    }, [user, authLoading, router]);



    const filteredGroups = subjectGroups.filter(g => 
        g.subject.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-sky-500 transition-colors" />
                        <input
                            placeholder={language === 'vi' ? "Tìm môn học..." : "Search subjects..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-12 pl-12 pr-4 bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 focus:border-sky-500 rounded-2xl text-sm outline-none transition-all shadow-sm"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-64 rounded-[2.5rem] bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                        ))}
                    </div>
                ) : subjectGroups.length === 0 ? (
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
                            <Button className="mt-8 rounded-2xl bg-sky-600 px-8">
                                {language === 'vi' ? 'Khám phá thêm' : 'Explore More'}
                            </Button>
                        </Link>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredGroups.map((group, idx) => (
                            <motion.div
                                key={group.subject}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                            >
                                <Card className="h-full border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden group hover:ring-2 ring-red-500 transition-all duration-300 flex flex-col">
                                    <CardHeader className="p-8 pb-4">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="w-14 h-14 bg-red-50 dark:bg-red-900/30 text-red-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                                <BookOpen className="h-7 w-7 text-red-500" />
                                            </div>
                                            <div className="px-3 py-1 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-full text-xs font-black uppercase tracking-wider">
                                                {group.questions.length} {language === 'vi' ? 'CÂU HỎI SAI' : 'WRONG QUESTIONS'}
                                            </div>
                                        </div>
                                        <CardTitle className="text-2xl font-black truncate text-zinc-900 dark:text-zinc-50 leading-tight">
                                            {group.subject}
                                        </CardTitle>
                                    </CardHeader>
                                    
                                    <CardContent className="px-8 pt-2 flex-1 flex flex-col justify-between gap-6">
                                        <div className="space-y-3">
                                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                                {language === 'vi' ? 'Xem trước câu hỏi' : 'Question Preview'}
                                            </p>
                                            <div className="space-y-2">
                                                {group.questions.slice(0, 3).map((q, qidx) => (
                                                    <div key={qidx} className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-400 items-start">
                                                        <span className="text-red-500 font-bold shrink-0">•</span>
                                                        <span className="truncate">{q.text}</span>
                                                    </div>
                                                ))}
                                                {group.questions.length > 3 && (
                                                    <p className="text-xs text-zinc-400 italic pl-3">
                                                        {language === 'vi' ? `và ${group.questions.length - 3} câu hỏi khác...` : `and ${group.questions.length - 3} more questions...`}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>

                                    <CardFooter className="p-8 pt-4">
                                        <Link href={`/practice/${encodeURIComponent(group.subject)}?mode=wrong`} className="w-full">
                                            <Button className="w-full h-14 gap-2 rounded-2xl bg-red-600 hover:bg-red-700 font-bold shadow-lg shadow-red-500/20 text-base">
                                                <RotateCcw className="h-5 w-5" />
                                                {language === 'vi' ? 'Luyện tập câu sai' : 'Practice Wrong Questions'}
                                            </Button>
                                        </Link>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
