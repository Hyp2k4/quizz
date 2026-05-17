"use client";

import { useEffect, useState, Suspense } from "react";
import { getUserQuizzes, deleteQuiz, QuizData } from "@/services/quizService";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { Edit, Trash2, BookOpen, Plus, UserPlus, Link as LinkIcon, ExternalLink, Layers, ChevronDown, ChevronUp, Share2, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "sonner";
import { CourseDetailsModal } from "@/components/quiz/CourseDetailsModal";
import { Info } from "lucide-react";

function MyCoursesContent() {
    const { t, language } = useLanguage();
    const { user, loading: authLoading } = useAuth();
    const [quizzes, setQuizzes] = useState<QuizData[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [selectedQuiz, setSelectedQuiz] = useState<QuizData | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [initialTab, setInitialTab] = useState<any>(undefined);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [joinLink, setJoinLink] = useState("");
    const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
    const router = useRouter();
    const searchParams = useSearchParams();

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

    const handleShareSubject = (subject: string) => {
        const url = `${window.location.origin}/courses?subject=${encodeURIComponent(subject)}`;
        navigator.clipboard.writeText(url);
        toast.success(language === 'vi' ? `Đã sao chép liên kết môn ${subject}!` : `${subject} subject link copied!`);
    };

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

    // Handle direct link to specific quiz and tab
    useEffect(() => {
        if (quizzes.length > 0) {
            const quizId = searchParams.get("quizId");
            const tab = searchParams.get("tab");
            
            if (quizId) {
                const targetQuiz = quizzes.find(q => q.id === quizId);
                if (targetQuiz) {
                    setSelectedQuiz(targetQuiz);
                    if (tab) setInitialTab(tab);
                    setIsDetailsOpen(true);
                    
                    // Clear the params from URL without refreshing
                    const newUrl = window.location.pathname;
                    window.history.replaceState({}, '', newUrl);
                }
            }
        }
    }, [quizzes, searchParams]);

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
            toast.error(language === 'vi' ? "Link không hợp lệ" : "Invalid link");
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;

        const toastId = toast.loading(language === 'vi' ? "Đang xóa..." : "Deleting...");
        try {
            await deleteQuiz(deleteId);
            setQuizzes(quizzes.filter(q => q.id !== deleteId));
            toast.success(language === 'vi' ? "Đã xóa thành công" : "Quiz deleted successfully", { id: toastId });
        } catch (error) {
            toast.error(language === 'vi' ? "Lỗi khi xóa bài trắc nghiệm" : "Failed to delete quiz. Check permissions.", { id: toastId });
        } finally {
            setDeleteId(null);
        }
    };

    if (authLoading) return <div className="min-h-screen pt-32 text-center">{t.common.loading}</div>;

    return (
        <div className="min-h-screen bg-[rgb(var(--background))]">
            <Navbar />
            <main className="pt-32 px-6 max-w-7xl mx-auto pb-20 animate-blur-reveal">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">{t.navbar.myCourses}</h1>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="gap-2 rounded-full border-sky-500/30 text-sky-600 hover:bg-sky-50"
                            onClick={() => setIsJoinModalOpen(true)}
                        >
                            <UserPlus className="h-4 w-4" /> {t.collaboration.join}
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
                ) : quizzes.length === 0 ? (
                    <div className="text-center py-20 bg-[rgb(var(--card))] rounded-3xl border border-dashed border-[rgb(var(--border))]">
                        <p className="text-[rgb(var(--muted-foreground))] mb-4">
                            {language === 'vi' ? 'Bạn chưa tạo bài trắc nghiệm nào.' : "You haven't created any quizzes yet."}
                        </p>
                        <Link href="/questionbuilder">
                            <Button variant="outline">
                                {language === 'vi' ? 'Tạo bài trắc nghiệm đầu tiên' : 'Create your first quiz'}
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {Object.entries(
                            quizzes.reduce((acc, quiz) => {
                                const subject = quiz.subject?.trim() || (language === 'vi' ? "Chưa phân loại" : "Uncategorized");
                                if (!acc[subject]) acc[subject] = [];
                                acc[subject].push(quiz);
                                return acc;
                            }, {} as Record<string, QuizData[]>)
                        ).map(([subject, subjectQuizzes]) => {
                            const isExpanded = expandedSubjects[subject] !== false;
                            return (
                                <div key={subject} className="space-y-6">
                                    <div 
                                        className="flex items-center justify-between group/header cursor-pointer"
                                        onClick={() => toggleSubject(subject)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-1 bg-sky-600 rounded-full" />
                                            <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                                <BookOpen className="h-5 w-5 text-sky-500" />
                                                {subject}
                                                <span className="text-xs font-bold px-2 py-1 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-lg ml-2">
                                                    {subjectQuizzes.length}
                                                </span>
                                            </h2>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 text-sky-500 hover:text-sky-600 hover:bg-sky-50 rounded-full"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleShareSubject(subject);
                                                }}
                                            >
                                                <Share2 className="h-5 w-5" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="rounded-full h-10 w-10 p-0 text-zinc-400 group-hover/header:bg-sky-50 group-hover/header:text-sky-600 transition-colors">
                                                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
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
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-2">
                                                    {subjectQuizzes.map(quiz => (
                                                        <Card key={quiz.id} className="hover:shadow-lg transition-all group border-none shadow-sm bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-[2rem] overflow-hidden">
                                                            <CardHeader className="pb-2">
                                                                <div className="flex justify-between items-start">
                                                                    <div className="p-3 bg-sky-100 dark:bg-sky-900/30 rounded-2xl text-sky-600 dark:text-sky-400 mb-4 transform -rotate-3 transition-transform group-hover:rotate-0">
                                                                        <BookOpen className="h-5 w-5" />
                                                                    </div>
                                                                    {quiz.userId === user?.uid && (
                                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8 text-sky-500 hover:text-sky-600 hover:bg-sky-50 rounded-full"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    quiz.id && handleShare(quiz.id);
                                                                                }}
                                                                            >
                                                                                <Share2 className="h-4 w-4" />
                                                                            </Button>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    quiz.id && handleDeleteClick(quiz.id);
                                                                                }}
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <CardTitle className="line-clamp-1 flex items-center justify-between gap-2 text-lg font-bold">
                                                                    {quiz.title}
                                                                    {quiz.userId !== user?.uid && (
                                                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full border border-amber-200">
                                                                            {t.collaboration.title}
                                                                        </span>
                                                                    )}
                                                                </CardTitle>
                                                            </CardHeader>
                                                            <CardContent>
                                                                <p className="text-sm text-zinc-500 line-clamp-2 min-h-[40px] leading-relaxed">
                                                                    {quiz.description || (language === 'vi' ? "Không có mô tả." : "No description provided.")}
                                                                </p>
                                                                <div className="mt-4 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                                                    <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {quiz.questions?.length || 0} {language === 'vi' ? 'CÂU HỎI' : 'QUESTIONS'}</span>
                                                                    <span className="h-1 w-1 bg-zinc-300 rounded-full" />
                                                                    <span>{new Date(quiz.createdAt?.seconds * 1000).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}</span>
                                                                </div>
                                                            </CardContent>
                                                            <CardFooter className="flex gap-2 pt-0 pb-6 px-6">
                                                                <Button
                                                                    variant="outline"
                                                                    className="flex-1 gap-2 rounded-2xl border-sky-100 hover:border-sky-500 hover:bg-sky-50 text-sky-600 font-bold text-xs"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedQuiz(quiz);
                                                                        setIsDetailsOpen(true);
                                                                    }}
                                                                >
                                                                    <Info className="h-4 w-4" /> {t.common.details}
                                                                </Button>
                                                                <Link href={`/questionbuilder?edit=${quiz.id}`} className="flex-1" onClick={(e) => e.stopPropagation()}>
                                                                    <Button variant="secondary" className="w-full gap-2 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-xs">
                                                                        <Edit className="h-4 w-4" /> {t.common.save}
                                                                    </Button>
                                                                </Link>
                                                            </CardFooter>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                )}

                <ConfirmDialog
                    isOpen={!!deleteId}
                    title={language === 'vi' ? "Xóa bài trắc nghiệm?" : "Delete Quiz"}
                    description={language === 'vi' ? "Bạn có chắc chắn muốn xóa bài trắc nghiệm này? Hành động này không thể hoàn tác." : "Are you sure you want to delete this quiz? This action cannot be undone."}
                    confirmText={t.common.delete}
                    cancelText={t.common.cancel}
                    variant="danger"
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteId(null)}
                />

                <CourseDetailsModal
                    isOpen={isDetailsOpen}
                    onClose={() => {
                        setIsDetailsOpen(false);
                        setSelectedQuiz(null);
                        setInitialTab(undefined);
                    }}
                    quiz={selectedQuiz}
                    initialTab={initialTab}
                />
            </main>
            {/* Join Collaboration Modal */}
            {isJoinModalOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl p-8 shadow-2xl space-y-6">
                        <div className="text-center space-y-2">
                            <div className="mx-auto w-16 h-16 bg-sky-100 dark:bg-sky-900/30 text-sky-600 rounded-2xl flex items-center justify-center mb-4 transform -rotate-3">
                                <LinkIcon className="h-8 w-8" />
                            </div>
                            <h2 className="text-2xl font-black">{t.collaboration.join}</h2>
                            <p className="text-sm text-zinc-500">{t.collaboration.inputLink}</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-zinc-400 px-1">{t.collaboration.inviteLink}</label>
                                <input
                                    autoFocus
                                    placeholder="https://example.com/accept-invite/..."
                                    value={joinLink}
                                    onChange={(e) => setJoinLink(e.target.value)}
                                    className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-800 focus:border-sky-500 rounded-2xl px-5 py-4 text-sm outline-none transition-all"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Button onClick={handleJoin} className="w-full h-12 rounded-2xl font-bold flex gap-2">
                                    {language === 'vi' ? 'Tiếp tục' : 'Continue'} <ExternalLink className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" onClick={() => setIsJoinModalOpen(false)} className="w-full h-12 rounded-2xl text-zinc-400">
                                    {t.common.cancel}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function MyCoursesPage() {
    return (
        <Suspense fallback={<div className="min-h-screen pt-32 text-center text-zinc-400 italic">Đang tải trang quản lý...</div>}>
            <MyCoursesContent />
        </Suspense>
    );
}
