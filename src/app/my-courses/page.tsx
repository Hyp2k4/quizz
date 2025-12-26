"use client";

import { useEffect, useState } from "react";
import { getUserQuizzes, deleteQuiz, QuizData } from "@/services/quizService";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { Edit, Trash2, BookOpen, Plus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "sonner";
import { CourseDetailsModal } from "@/components/quiz/CourseDetailsModal";
import { Info } from "lucide-react";

export default function MyCoursesPage() {
    const { t } = useLanguage();
    const { user, loading: authLoading } = useAuth();
    const [quizzes, setQuizzes] = useState<QuizData[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [selectedQuiz, setSelectedQuiz] = useState<QuizData | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/");
            return;
        }

        async function fetch() {
            if (!user) return;
            try {
                const data = await getUserQuizzes(user.uid);
                setQuizzes(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }

        if (user) fetch();
    }, [user, authLoading, router]);

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;

        const toastId = toast.loading("Deleting...");
        try {
            await deleteQuiz(deleteId);
            setQuizzes(quizzes.filter(q => q.id !== deleteId));
            toast.success("Quiz deleted successfully", { id: toastId });
        } catch (error) {
            toast.error("Failed to delete quiz. Check permissions.", { id: toastId });
        } finally {
            setDeleteId(null);
        }
    };

    if (authLoading) return <div className="min-h-screen pt-32 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-[rgb(var(--background))]">
            <Navbar />
            <main className="pt-32 px-6 max-w-7xl mx-auto pb-20 animate-blur-reveal">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">{t.navbar.myCourses}</h1>
                    <Link href="/questionbuilder">
                        <Button className="gap-2 rounded-full">
                            <Plus className="h-4 w-4" /> {t.navbar.createQuiz}
                        </Button>
                    </Link>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-64 rounded-2xl bg-[rgb(var(--secondary))/20] animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {quizzes.length === 0 ? (
                            <div className="col-span-3 text-center py-20 bg-[rgb(var(--card))] rounded-3xl border border-dashed border-[rgb(var(--border))]">
                                <p className="text-[rgb(var(--muted-foreground))] mb-4">You haven't created any quizzes yet.</p>
                                <Link href="/questionbuilder">
                                    <Button variant="outline">Create your first quiz</Button>
                                </Link>
                            </div>
                        ) : (
                            quizzes.map(quiz => (
                                <Card key={quiz.id} className="hover:shadow-lg transition-all group">
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 mb-4">
                                                <BookOpen className="h-6 w-6" />
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                    onClick={() => quiz.id && handleDeleteClick(quiz.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
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
                                            <span>•</span>
                                            <span>{new Date(quiz.createdAt?.seconds * 1000).toLocaleDateString()}</span>
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
                                        <Link href={`/questionbuilder?edit=${quiz.id}`} className="flex-1">
                                            <Button variant="secondary" className="w-full gap-2 rounded-xl">
                                                <Edit className="h-4 w-4" /> Sửa
                                            </Button>
                                        </Link>
                                    </CardFooter>
                                </Card>
                            ))
                        )}
                    </div>
                )}

                <ConfirmDialog
                    isOpen={!!deleteId}
                    title="Delete Quiz"
                    description="Are you sure you want to delete this quiz? This action cannot be undone."
                    confirmText="Delete"
                    cancelText="Cancel"
                    variant="danger"
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteId(null)}
                />

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
