"use client";

import { useEffect, useState } from "react";
import { getUserQuizResults, QuizResult, getQuizById, QuizData } from "@/services/quizService";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Trophy, Clock, ChevronRight, BookOpen, BarChart3 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const { t, language } = useLanguage();
    const [results, setResults] = useState<(QuizResult & { quiz?: QuizData })[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/");
            return;
        }

        async function fetchResults() {
            if (!user) return;
            try {
                const data = await getUserQuizResults(user.uid);
                
                // Fetch quiz details for each result to get titles
                const resultsWithQuizzes = await Promise.all(
                    data.map(async (result) => {
                        const quiz = await getQuizById(result.quizId);
                        return { ...result, quiz: quiz || undefined };
                    })
                );
                
                setResults(resultsWithQuizzes);
            } catch (error) {
                console.error("Error fetching user results:", error);
            } finally {
                setLoading(false);
            }
        }

        if (user) fetchResults();
    }, [user, authLoading, router]);

    const formatDate = (date: any) => {
        if (!date) return "";
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString(language === 'vi' ? "vi-VN" : "en-US", { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    if (authLoading) return <div className="min-h-screen pt-32 text-center">{t.common.loading}</div>;

    return (
        <div className="min-h-screen bg-[rgb(var(--background))]">
            <Navbar />
            <main className="pt-32 px-6 max-w-5xl mx-auto pb-20 animate-blur-reveal">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight">{language === 'vi' ? 'Bảng điều khiển học tập' : 'Learning Dashboard'}</h1>
                        <p className="text-[rgb(var(--muted-foreground))] mt-2">
                            {language === 'vi' ? 'Xem lại kết quả và tiến độ học tập của bạn' : 'Review your quiz results and learning progress'}
                        </p>
                    </div>
                    <div className="bg-sky-50 dark:bg-sky-950/30 px-6 py-4 rounded-3xl border border-sky-100 dark:border-sky-900/30 flex items-center gap-4">
                        <div className="h-12 w-12 bg-sky-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
                            <Trophy className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="text-xs font-bold uppercase text-sky-600 dark:text-sky-400">{language === 'vi' ? 'Tổng bài đã làm' : 'Total Quizzes'}</div>
                            <div className="text-2xl font-black">{results.length}</div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 w-full bg-[rgb(var(--secondary))/10] rounded-3xl animate-pulse" />
                        ))}
                    </div>
                ) : results.length === 0 ? (
                    <div className="text-center py-20 bg-[rgb(var(--card))] rounded-[40px] border-2 border-dashed border-[rgb(var(--border))]">
                        <div className="h-20 w-20 bg-zinc-100 dark:bg-zinc-800 rounded-3xl flex items-center justify-center mx-auto mb-6 text-zinc-400">
                            <BookOpen className="h-10 w-10" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">{language === 'vi' ? 'Chưa có kết quả nào' : 'No results yet'}</h2>
                        <p className="text-[rgb(var(--muted-foreground))] mb-8 max-w-md mx-auto">
                            {language === 'vi' ? 'Hãy bắt đầu làm bài trắc nghiệm để theo dõi tiến độ của bạn tại đây.' : 'Start taking quizzes to track your progress here.'}
                        </p>
                        <Link href="/">
                            <Button className="rounded-full px-8 h-12 font-bold">
                                {language === 'vi' ? 'Khám phá ngay' : 'Explore Now'}
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {results.map((result) => (
                            <Card key={result.id} className="overflow-hidden hover:shadow-xl transition-all border-none bg-[rgb(var(--card))] group">
                                <CardContent className="p-0">
                                    <div className="flex flex-col md:flex-row items-stretch md:items-center">
                                        <div className={`w-2 self-stretch ${
                                            (result.score / result.totalQuestions) >= 0.8 ? 'bg-emerald-500' :
                                            (result.score / result.totalQuestions) >= 0.5 ? 'bg-amber-500' :
                                            'bg-red-500'
                                        }`} />
                                        
                                        <div className="flex-1 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                            <div className="space-y-1">
                                                <h3 className="text-xl font-bold group-hover:text-sky-600 transition-colors">
                                                    {result.quiz?.title || (language === 'vi' ? 'Bài tập đã xóa' : 'Deleted Quiz')}
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-4 text-sm text-[rgb(var(--muted-foreground))]">
                                                    <span className="flex items-center gap-1.5">
                                                        <Clock className="h-4 w-4" />
                                                        {formatDate(result.createdAt)}
                                                    </span>
                                                    <span className="flex items-center gap-1.5">
                                                        <BarChart3 className="h-4 w-4" />
                                                        {result.totalQuestions} {language === 'vi' ? 'câu hỏi' : 'questions'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-8">
                                                <div className="text-right">
                                                    <div className="text-xs font-bold uppercase text-[rgb(var(--muted-foreground))] mb-1">{language === 'vi' ? 'Kết quả' : 'Result'}</div>
                                                    <div className={`text-3xl font-black ${
                                                        (result.score / result.totalQuestions) >= 0.8 ? 'text-emerald-600' :
                                                        (result.score / result.totalQuestions) >= 0.5 ? 'text-amber-600' :
                                                        'text-red-600'
                                                    }`}>
                                                        {result.score}<span className="text-lg opacity-40">/{result.totalQuestions}</span>
                                                    </div>
                                                </div>
                                                
                                                <Link href={`/courses/${result.quizId}`}>
                                                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl hover:bg-sky-600 hover:text-white hover:border-sky-600 transition-all">
                                                        <ChevronRight className="h-6 w-6" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
