"use client";

import { useEffect, useState } from "react";
import { getQuizzes, QuizData } from "@/services/quizService";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ArrowRight, BookOpen, Info } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { CourseDetailsModal } from "@/components/quiz/CourseDetailsModal";

export default function CoursesPage() {
    const { t } = useLanguage();
    const [quizzes, setQuizzes] = useState<QuizData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuiz, setSelectedQuiz] = useState<QuizData | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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

    return (
        <div className="min-h-screen bg-[rgb(var(--background))]">
            <Navbar />
            <main className="pt-32 px-6 max-w-7xl mx-auto animate-blur-reveal">
                <h1 className="text-4xl font-bold mb-8">{t.navbar.allCourses}</h1>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-64 rounded-2xl bg-[rgb(var(--secondary))/20] animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {quizzes.length === 0 ? (
                            <p className="text-[rgb(var(--muted-foreground))]">No courses available yet.</p>
                        ) : (
                            quizzes.map(quiz => (
                                <Card key={quiz.id} className="hover:shadow-lg transition-all hover:-translate-y-1">
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 mb-4">
                                                <BookOpen className="h-6 w-6" />
                                            </div>
                                        </div>
                                        <CardTitle className="line-clamp-1">{quiz.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-[rgb(var(--muted-foreground))] line-clamp-2 min-h-[40px]">
                                            {quiz.description || "No description provided."}
                                        </p>
                                        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-[rgb(var(--muted-foreground))]">
                                            <span>{quiz.questions?.length || 0} Questions</span>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            className="flex-1 gap-2 rounded-xl"
                                            onClick={() => {
                                                setSelectedQuiz(quiz);
                                                setIsDetailsOpen(true);
                                            }}
                                        >
                                            <Info className="h-4 w-4" /> Chi tiết
                                        </Button>
                                        <Link href={`/courses/${quiz.id}`} className="flex-[1.5]">
                                            <Button className="w-full gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700">
                                                Làm bài <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </CardFooter>
                                </Card>
                            ))
                        )}
                    </div>
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
