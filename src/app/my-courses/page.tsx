"use client";

import { useEffect, useState } from "react";
import { getUserQuizzes, deleteQuiz, QuizData } from "@/services/quizService";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { Edit, Trash2, BookOpen, Plus, UserPlus, Link as LinkIcon, ExternalLink } from "lucide-react";
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
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [joinLink, setJoinLink] = useState("");
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/");
            return;
        }

        async function fetch() {
            if (!user) return;
            try {
                const data = await getUserQuizzes(user.uid, user.email);
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

    const handleJoin = () => {
        if (!joinLink.trim()) return;
        
        // Extract ID from link if it's a full URL, or use as is if it's just the ID
        let inviteId = joinLink.trim();
        if (inviteId.includes("/accept-invite/")) {
            inviteId = inviteId.split("/accept-invite/").pop() || "";
        }
        
        if (inviteId) {
            router.push(`/accept-invite/${inviteId}`);
        } else {
            toast.error("Link không hợp lệ");
        }
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
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="gap-2 rounded-full border-indigo-500/30 text-indigo-600 hover:bg-indigo-50"
                            onClick={() => setIsJoinModalOpen(true)}
                        >
                            <UserPlus className="h-4 w-4" /> Tham gia cộng tác
                        </Button>
                        <Link href="/questionbuilder">
                            <Button className="gap-2 rounded-full">
                                <Plus className="h-4 w-4" /> {t.navbar.createQuiz}
                            </Button>
                        </Link>
                    </div>
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
                                            {quiz.userId === user?.uid && (
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
                                            )}
                                        </div>
                                        <CardTitle className="line-clamp-1 flex items-center justify-between gap-2">
                                            {quiz.title}
                                            {quiz.userId !== user?.uid && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full border border-amber-200">
                                                    Cộng tác
                                                </span>
                                            )}
                                        </CardTitle>
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
            {/* Join Collaboration Modal */}
            {isJoinModalOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl p-8 shadow-2xl space-y-6">
                        <div className="text-center space-y-2">
                            <div className="mx-auto w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 transform -rotate-3">
                                <LinkIcon className="h-8 w-8" />
                            </div>
                            <h2 className="text-2xl font-black">Tham gia cộng tác</h2>
                            <p className="text-sm text-zinc-500">Dán link mời nhận được từ chủ khóa học để bắt đầu đồng hành cùng họ.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-zinc-400 px-1">Link mời</label>
                                <input
                                    autoFocus
                                    placeholder="https://example.com/accept-invite/..."
                                    value={joinLink}
                                    onChange={(e) => setJoinLink(e.target.value)}
                                    className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-800 focus:border-indigo-500 rounded-2xl px-5 py-4 text-sm outline-none transition-all"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Button onClick={handleJoin} className="w-full h-12 rounded-2xl font-bold flex gap-2">
                                    Tiếp tục <ExternalLink className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" onClick={() => setIsJoinModalOpen(false)} className="w-full h-12 rounded-2xl text-zinc-400">
                                    Hủy bỏ
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
