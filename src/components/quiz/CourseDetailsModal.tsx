"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
    QuizData,
    Comment,
    getQuizComments,
    addQuizComment,
    addCommentReply,
    createNotification,
    addCollaborator,
    removeCollaborator,
    getQuizById,
    createQuizInvitation,
    updateQuizVisibility,
    getQuizReports,
    updateReportStatus,
    resolveReportWithAnswer,
    getQuizViewers,
    QuestionReport,
    QuizView
} from "@/services/quizService";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useAuth } from "@/contexts/AuthContext";
import { X, Send, MessageCircle, User, CornerDownRight, Clock, AlertCircle, Users, UserPlus, UserMinus, Copy, Check, Lock, Globe, Key, Share2, Mail, BarChart3, Trophy, Users2, Target, Eye, Flag, Edit, CheckCircle, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRouter } from "next/navigation";

interface CourseDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    quiz: QuizData | null;
    initialTab?: 'comments' | 'collaboration' | 'visibility' | 'analytics' | 'reports';
}

export function CourseDetailsModal({ isOpen, onClose, quiz, initialTab }: CourseDetailsModalProps) {
    const { user, login } = useAuth();
    const { t, language } = useLanguage();
    const router = useRouter();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<'comments' | 'collaboration' | 'visibility' | 'analytics' | 'reports'>('comments');
    const [collabEmail, setCollabEmail] = useState("");
    const [currentQuiz, setCurrentQuiz] = useState<QuizData | null>(quiz);
    const [isCollabLoading, setIsCollabLoading] = useState(false);
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [isVisibilityLoading, setIsVisibilityLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
    const [reports, setReports] = useState<QuestionReport[]>([]);
    const [isReportsLoading, setIsReportsLoading] = useState(false);
    const [editingReportId, setEditingReportId] = useState<string | null>(null);
    const [resolvingAnswer, setResolvingAnswer] = useState<string[]>([]);
    const [viewers, setViewers] = useState<QuizView[]>([]);
    const [isViewersLoading, setIsViewersLoading] = useState(false);
    const [showViewersList, setShowViewersList] = useState(false);

    const isOwner = user && currentQuiz?.userId === user.uid;

    useEffect(() => {
        setMounted(true);
        if (isOpen && quiz?.id) {
            setCurrentQuiz(quiz);
            if (initialTab) setActiveTab(initialTab);
            if (activeTab === 'comments') loadComments();
            if (activeTab === 'analytics') loadAnalytics();
            if (activeTab === 'reports') loadReports();
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => { document.body.style.overflow = "unset"; };
    }, [isOpen, quiz, activeTab]);

    const refreshQuiz = async () => {
        if (!quiz?.id) return;
        const updated = await getQuizById(quiz.id);
        if (updated) setCurrentQuiz(updated);
    };

    const loadComments = async () => {
        if (!quiz?.id) return;
        setIsLoading(true);
        try {
            const data = await getQuizComments(quiz.id);
            setComments(data);
        } catch (error) {
            console.error("Error loading comments:", error);
        } finally {
            setIsLoading(false);
        }
    };
    const loadAnalytics = async () => {
        if (!quiz?.id) return;
        setIsAnalyticsLoading(true);
        try {
            const { getQuizResults } = await import("@/services/quizService");
            const data = await getQuizResults(quiz.id);
            setResults(data);
        } catch (error) {
            console.error("Error loading analytics:", error);
        } finally {
            setIsAnalyticsLoading(false);
        }
    };
    
    const loadReports = async () => {
        if (!quiz?.id) return;
        setIsReportsLoading(true);
        try {
            const data = await getQuizReports(quiz.id);
            setReports(data);
        } catch (error) {
            console.error("Error loading reports:", error);
        } finally {
            setIsReportsLoading(false);
        }
    };

    const loadViewers = async () => {
        if (!quiz?.id) return;
        setIsViewersLoading(true);
        try {
            const data = await getQuizViewers(quiz.id);
            setViewers(data);
        } catch (error) {
            console.error("Error loading viewers:", error);
        } finally {
            setIsViewersLoading(false);
        }
    };

    const handleResolveReport = async (reportId: string) => {
        try {
            await updateReportStatus(reportId, 'resolved', user ? { uid: user.uid, name: user.displayName || "Owner" } : undefined);
            toast.success(language === 'vi' ? "Đã đánh dấu là đã xử lý" : "Marked as resolved");
            loadReports();
        } catch (error) {
            toast.error(t.common.error);
        }
    };

    const handleQuickResolve = async (report: QuestionReport) => {
        if (!user) return;
        setIsReportsLoading(true);
        try {
            await resolveReportWithAnswer(report, resolvingAnswer, { uid: user.uid, name: user.displayName || "Owner" });
            toast.success(language === 'vi' ? "Đã cập nhật đáp án và xử lý báo cáo" : "Answer updated and report resolved");
            setEditingReportId(null);
            loadReports();
            refreshQuiz();
        } catch (error) {
            toast.error(t.common.error);
        } finally {
            setIsReportsLoading(false);
        }
    };

    const handleAddComment = async () => {
        if (!user) {
            toast.error(language === 'vi' ? "Vui lòng đăng nhập để bình luận" : "Please login to comment");
            login();
            return;
        }
        if (!newComment.trim() || !currentQuiz?.id) return;

        try {
            await addQuizComment(currentQuiz.id, newComment, user.uid, user.displayName || "Anonymous", user.email || undefined);

            // Create notification and send email for course owner
            if (currentQuiz.userId && currentQuiz.userId !== user.uid) {
                await createNotification({
                    userId: currentQuiz.userId,
                    type: 'comment',
                    title: language === 'vi' ? 'Bình luận mới!' : 'New comment!',
                    message: `${user.displayName || (language === 'vi' ? "Ai đó" : "Someone")} ${language === 'vi' ? 'vừa bình luận trong' : 'just commented in'} "${currentQuiz.title}": "${newComment.substring(0, 30)}..."`,
                    link: `#`
                });

                // Send email to owner if they have an email
                if (currentQuiz.authorEmail) {
                    fetch('/api/send-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'comment',
                            to: currentQuiz.authorEmail,
                            language: language,
                            data: {
                                userName: user.displayName || user.email || "Anonymous",
                                quizTitle: currentQuiz.title,
                                commentText: newComment,
                                link: `${window.location.origin}/courses/${currentQuiz.id}`
                            }
                        })
                    }).catch(err => console.error("Error sending comment email notification:", err));
                }
            }

            setNewComment("");
            loadComments();
            toast.success(t.common.success);
        } catch (error) {
            toast.error(t.common.error);
        }
    };

    const handleAddReply = async (commentId: string) => {
        if (!user) {
            toast.error(language === 'vi' ? "Vui lòng đăng nhập để phản hồi" : "Please login to reply");
            login();
            return;
        }
        if (!replyText.trim()) return;

        try {
            await addCommentReply(commentId, replyText, user.uid, user.displayName || "Anonymous", user.email || undefined);

            // Find matching comment to notify the original author
            const originalComment = comments.find(c => c.id === commentId);
            if (originalComment && originalComment.userId !== user.uid && originalComment.userEmail) {
                fetch('/api/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'reply',
                        to: originalComment.userEmail,
                        language: language,
                        data: {
                            userName: user.displayName || user.email || "Anonymous",
                            quizTitle: currentQuiz?.title || "Course",
                            replyText: replyText,
                            link: `${window.location.origin}/courses/${currentQuiz?.id}`
                        }
                    })
                }).catch(err => console.error("Error sending reply email notification:", err));
            }

            setReplyText("");
            setReplyingTo(null);
            loadComments();
            toast.success(t.common.success);
        } catch (error) {
            toast.error(t.common.error);
        }
    };

    const handleInviteCollab = async () => {
        if (!currentQuiz?.id || !collabEmail.trim() || !user) return;
        if (!collabEmail.includes("@")) {
            toast.error(language === 'vi' ? "Email không hợp lệ" : "Invalid email");
            return;
        }

        setIsCollabLoading(true);
        try {
            const inviteId = await createQuizInvitation(
                currentQuiz.id,
                currentQuiz.title,
                user.displayName || "Anonymous",
                collabEmail.trim().toLowerCase()
            );

            const origin = window.location.origin;
            const fullLink = `${origin}/accept-invite/${inviteId}`;
            setInviteLink(fullLink);

            // Gửi email mời thông qua API
            fetch('/api/send-invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inviteeEmail: collabEmail.trim().toLowerCase(),
                    inviterName: user.displayName || user.email || (language === 'vi' ? "Một người dùng" : "A user"),
                    quizTitle: currentQuiz.title,
                    inviteLink: fullLink,
                    language: language
                })
            }).then(res => res.json()).then(data => {
                if (data.success) {
                    toast.success(`${language === 'vi' ? 'Đã gửi mail mời tới' : 'Invitation email sent to'} ${collabEmail}`);
                } else {
                    console.warn("Email alert:", data.error);
                    // Thông báo cho người dùng cấu hình Env nếu lỗi
                    if (data.error?.includes("RESEND_API_KEY")) {
                        toast.error(language === 'vi' ? "Vui lòng cấu hình RESEND_API_KEY trong .env để thực hiện gửi mail." : "Please configure RESEND_API_KEY in .env to send emails.");
                    }
                }
            }).catch(e => console.error("Email error:", e));

            toast.success(`${language === 'vi' ? 'Đã tạo lời mời cho' : 'Invitation created for'} ${collabEmail}`);
            setCollabEmail("");
        } catch (error) {
            toast.error(t.common.error);
        } finally {
            setIsCollabLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success(t.common.copied);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRemoveCollab = async (email: string) => {
        if (!currentQuiz?.id) return;

        try {
            await removeCollaborator(currentQuiz.id, email);
            toast.success(t.common.success);
            await refreshQuiz();
        } catch (error) {
            toast.error(t.common.error);
        }
    };

    const handleToggleVisibility = async (visibility: 'public' | 'private') => {
        if (!currentQuiz?.id) return;
        setIsVisibilityLoading(true);
        try {
            await updateQuizVisibility(currentQuiz.id, visibility);
            await refreshQuiz();
            toast.success(t.common.success);
        } catch (error) {
            toast.error(t.common.error);
        } finally {
            setIsVisibilityLoading(false);
        }
    };

    if (!mounted || !isOpen || !currentQuiz) return null;

    const formatDate = (date: any) => {
        if (!date) return "";
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString(language === 'vi' ? "vi-VN" : "en-US", { hour: '2-digit', minute: '2-digit' });
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 shadow-2xl flex flex-col"
            >
                {/* Header */}
                <div 
                    className="h-32 md:h-48 w-full bg-cover bg-center relative shrink-0"
                    style={{ backgroundImage: `url('${currentQuiz.imageUrl || `https://picsum.photos/seed/${currentQuiz.id || encodeURIComponent(currentQuiz.title)}/800/400`}')` }}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-zinc-900 via-transparent to-black/30" />
                    <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-4 right-4 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm z-10">
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                
                <div className="p-6 pt-0 border-b dark:border-zinc-800 bg-white dark:bg-zinc-900 relative z-10">
                    <div>
                        <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{currentQuiz.title}</h2>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-1">{currentQuiz.description}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-3 text-sm font-medium">
                            <span className="px-3 py-1 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-full">
                                {currentQuiz.subject || (language === 'vi' ? "Chưa phân loại" : "Uncategorized")}
                            </span>
                            {currentQuiz.chapter !== undefined && currentQuiz.chapter !== null && (currentQuiz.chapter as any) !== "" && (
                                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full font-bold border border-indigo-100/50 dark:border-indigo-900/30">
                                    {language === 'vi' ? `Chương ${currentQuiz.chapter}` : `Chapter ${currentQuiz.chapter}`}
                                    {currentQuiz.chapterName && `: ${currentQuiz.chapterName}`}
                                </span>
                            )}
                            <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full">
                                {currentQuiz.questions.length} {language === 'vi' ? 'câu hỏi' : 'questions'}
                            </span>
                            {currentQuiz.questions.filter(q => q.type !== 'open' && q.correctAnswer.length === 0).length > 0 && (
                                <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center gap-1.5 border border-amber-200 dark:border-amber-800 animate-pulse">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    {currentQuiz.questions.filter(q => q.type !== 'open' && q.correctAnswer.length === 0).length} {language === 'vi' ? 'câu thiếu đáp án' : 'questions missing answers'}
                                </span>
                            )}
                            <span className="text-zinc-400">{language === 'vi' ? 'Tác giả' : 'Author'}: {currentQuiz.authorName || (language === 'vi' ? "Ẩn danh" : "Anonymous")}</span>
                        </div>
                    </div>
                </div>

                {/* Tabs for Owner */}
                {isOwner && (
                    <div className="flex border-b dark:border-zinc-800 px-6 bg-white dark:bg-zinc-900">
                        <button
                            onClick={() => setActiveTab('comments')}
                            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'comments'
                                ? 'border-sky-500 text-sky-500'
                                : 'border-transparent text-zinc-500 hover:text-zinc-700'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <MessageCircle className="h-4 w-4" /> {t.comments.title}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('collaboration')}
                            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'collaboration'
                                ? 'border-sky-500 text-sky-500'
                                : 'border-transparent text-zinc-500 hover:text-zinc-700'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <Users className="h-4 w-4" /> {t.collaboration.title}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('visibility')}
                            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'visibility'
                                ? 'border-sky-500 text-sky-500'
                                : 'border-transparent text-zinc-500 hover:text-zinc-700'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <Lock className="h-4 w-4" /> {t.visibility.title}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'analytics'
                                ? 'border-sky-500 text-sky-500'
                                : 'border-transparent text-zinc-500 hover:text-zinc-700'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <BarChart3 className="h-4 w-4" /> {t.analytics.title}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('reports')}
                            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'reports'
                                ? 'border-red-500 text-red-500'
                                : 'border-transparent text-zinc-500 hover:text-zinc-700'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <Flag className="h-4 w-4" /> {language === 'vi' ? 'Báo cáo lỗi' : 'Reports'}
                                {reports.length > 0 && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                            </span>
                        </button>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-6">
                    <AnimatePresence mode="wait">
                        {activeTab === 'comments' ? (
                            <motion.div
                                key="comments"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="space-y-4"
                            >
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <MessageCircle className="h-5 w-5 text-sky-500" />
                                    {language === 'vi' ? 'Nhận xét từ cộng đồng' : 'Community Comments'} ({comments.length})
                                </h3>

                                {/* Comment Input */}
                                <div className="flex gap-3">
                                    <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                                        <User className="h-5 w-5 text-zinc-400" />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <Textarea
                                            placeholder={t.comments.writeComment}
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            className="min-h-[80px] rounded-2xl resize-none bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800"
                                        />
                                        <div className="flex justify-end">
                                            <Button onClick={handleAddComment} size="sm" className="rounded-full gap-2 px-6">
                                                {t.comments.post} <Send className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Comments List */}
                                <div className="space-y-6 mt-8">
                                    {isLoading ? (
                                        <div className="text-center py-10 text-zinc-400">{t.common.loading}</div>
                                    ) : comments.length === 0 ? (
                                        <div className="text-center py-10 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl text-zinc-400">
                                            {language === 'vi' ? 'Chưa có nhận xét nào. Hãy là người đầu tiên!' : 'No comments yet. Be the first!'}
                                        </div>
                                    ) : (
                                        comments.map(comment => (
                                            <div key={comment.id} className="group">
                                                <div className="flex gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center shrink-0 border border-sky-200 dark:border-sky-800">
                                                        <User className="h-5 w-5 text-sky-600" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl rounded-tl-none border border-zinc-100 dark:border-zinc-800">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="font-bold text-sm">{comment.userName}</span>
                                                                <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    {formatDate(comment.createdAt)}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{comment.text}</p>
                                                        </div>

                                                        <div className="flex items-center gap-4 mt-2 ml-2">
                                                            <button
                                                                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id!)}
                                                                className="text-xs font-bold text-sky-500 hover:text-sky-600 transition-colors"
                                                            >
                                                                {t.comments.reply}
                                                            </button>
                                                        </div>

                                                        {/* Replies */}
                                                        {comment.replies && comment.replies.length > 0 && (
                                                            <div className="mt-4 space-y-4 ml-6 border-l-2 border-zinc-100 dark:border-zinc-800 pl-4">
                                                                {comment.replies.map(reply => (
                                                                    <div key={reply.id} className="flex gap-3">
                                                                        <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                                                                            <User className="h-4 w-4 text-zinc-400" />
                                                                        </div>
                                                                        <div className="flex-1 bg-zinc-50/50 dark:bg-zinc-800/20 p-3 rounded-xl">
                                                                            <div className="flex justify-between items-center mb-1">
                                                                                <span className="font-bold text-xs">{reply.userName}</span>
                                                                                <span className="text-[10px] text-zinc-400">{formatDate(reply.createdAt)}</span>
                                                                            </div>
                                                                            <p className="text-xs text-zinc-600 dark:text-zinc-400">{reply.text}</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Reply Input */}
                                                        <AnimatePresence>
                                                            {replyingTo === comment.id && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: "auto", opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    className="mt-4 ml-6 space-y-2 overflow-hidden"
                                                                >
                                                                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 mb-1">
                                                                        <CornerDownRight className="h-3 w-3" />
                                                                        {language === 'vi' ? 'Phản hồi cho' : 'Reply to'} {comment.userName}
                                                                    </div>
                                                                    <Textarea
                                                                        placeholder={t.comments.writeComment}
                                                                        value={replyText}
                                                                        onChange={(e) => setReplyText(e.target.value)}
                                                                        className="min-h-[60px] rounded-xl text-sm"
                                                                    />
                                                                    <div className="flex justify-end gap-2 text-xs">
                                                                        <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>{t.common.cancel}</Button>
                                                                        <Button onClick={() => handleAddReply(comment.id!)} size="sm" className="rounded-full px-4">{t.comments.post}</Button>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        ) : activeTab === 'collaboration' ? (
                            <motion.div
                                key="collaboration"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-6"
                            >
                                <div className="bg-sky-50 dark:bg-sky-900/20 p-6 rounded-3xl border border-sky-100 dark:border-sky-800">
                                    <h3 className="text-lg font-bold flex items-center gap-2 text-sky-700 dark:text-sky-400 mb-2">
                                        <UserPlus className="h-5 w-5" />
                                        {t.collaboration.invite}
                                    </h3>
                                    <p className="text-sm text-sky-600/70 dark:text-sky-400/70 mb-4">
                                        {t.collaboration.inviteDesc}
                                    </p>
                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            placeholder={t.collaboration.placeholder}
                                            value={collabEmail}
                                            onChange={(e) => setCollabEmail(e.target.value)}
                                            className="flex-1 bg-white dark:bg-zinc-800 border border-sky-200 dark:border-sky-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 ring-sky-500/20"
                                        />
                                        <Button
                                            onClick={handleInviteCollab}
                                            disabled={isCollabLoading || !collabEmail}
                                            className="rounded-xl px-6"
                                        >
                                            {isCollabLoading ? t.common.loading : t.collaboration.sendInvite}
                                        </Button>
                                    </div>

                                    <AnimatePresence>
                                        {inviteLink && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                className="p-4 bg-white dark:bg-zinc-800 rounded-2xl border-2 border-dashed border-sky-200 dark:border-sky-800/50 overflow-hidden"
                                            >
                                                <p className="text-xs font-bold text-sky-500 mb-2 uppercase tracking-wide">{t.collaboration.inviteLink}</p>
                                                <div className="flex gap-2">
                                                    <input
                                                        readOnly
                                                        value={inviteLink}
                                                        className="flex-1 bg-zinc-50 dark:bg-zinc-900 border-none rounded-lg px-3 py-2 text-xs font-mono text-zinc-500"
                                                    />
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => copyToClipboard(inviteLink)}
                                                        className="rounded-lg px-3 shrink-0"
                                                    >
                                                        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                                <div className="flex gap-2 mt-3">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1 gap-2 rounded-xl text-xs h-9 border-sky-200"
                                                        onClick={() => {
                                                            const subject = encodeURIComponent(language === 'vi' ? `[Lustio] Mời cộng tác khóa học: ${currentQuiz.title}` : `[Lustio] Course Collaboration Invite: ${currentQuiz.title}`);
                                                            const body = encodeURIComponent(language === 'vi'
                                                                ? `Chào bạn,\n\n${user?.displayName || 'Tôi'} đã mời bạn cộng tác trong khóa học "${currentQuiz.title}" trên Lustio Quizz.\n\nNhấn vào link này để chấp nhận: ${inviteLink}\n\nTrân trọng!`
                                                                : `Hello,\n\n${user?.displayName || 'I'} have invited you to collaborate on the course "${currentQuiz.title}" on Lustio Quizz.\n\nClick here to accept: ${inviteLink}\n\nBest regards!`);
                                                            window.location.href = `mailto:${collabEmail}?subject=${subject}&body=${body}`;
                                                        }}
                                                    >
                                                        <Mail className="h-3.5 w-3.5" /> {language === 'vi' ? 'Gửi qua Email cá nhân' : 'Send via Personal Email'}
                                                    </Button>

                                                    {typeof navigator.share !== 'undefined' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="flex-1 gap-2 rounded-xl text-xs h-9 border-sky-200"
                                                            onClick={() => {
                                                                navigator.share({
                                                                    title: currentQuiz.title,
                                                                    text: language === 'vi' ? `Cộng tác với tôi trong khóa học ${currentQuiz.title}` : `Collaborate with me on ${currentQuiz.title}`,
                                                                    url: inviteLink
                                                                }).catch(() => { });
                                                            }}
                                                        >
                                                            <Share2 className="h-3.5 w-3.5" /> {language === 'vi' ? 'Chia sẻ khác' : 'Other Share'}
                                                        </Button>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-zinc-400 mt-3 italic">{t.collaboration.securityNote}</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider px-2">
                                        {t.collaboration.list} ({currentQuiz.collaborators?.length || 0})
                                    </h3>
                                    <div className="space-y-2">
                                        {(!currentQuiz.collaborators || currentQuiz.collaborators.length === 0) ? (
                                            <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-800/30 rounded-3xl border-2 border-dashed border-zinc-100 dark:border-zinc-800 text-zinc-400 text-sm">
                                                {t.collaboration.noCollabs}
                                            </div>
                                        ) : (
                                            currentQuiz.collaborators.map(email => (
                                                <div key={email} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 group hover:border-sky-200 dark:hover:border-sky-800 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                                            <User className="h-5 w-5 text-zinc-400" />
                                                        </div>
                                                        <span className="text-sm font-medium">{email}</span>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemoveCollab(email)}
                                                        className="h-8 w-8 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <UserMinus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ) : activeTab === 'visibility' ? (
                            <motion.div
                                key="visibility"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-6"
                            >
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider px-2">{t.visibility.title}</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            disabled={isVisibilityLoading}
                                            onClick={() => handleToggleVisibility('public')}
                                            className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${currentQuiz.visibility !== 'private'
                                                ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400'
                                                : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700'
                                                }`}
                                        >
                                            <div className={`p-3 rounded-2xl ${currentQuiz.visibility !== 'private' ? 'bg-sky-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                                                <Globe className="h-6 w-6" />
                                            </div>
                                            <div className="text-center">
                                                <div className="font-bold">{t.visibility.public}</div>
                                                <div className="text-xs opacity-70">{t.visibility.publicDesc}</div>
                                            </div>
                                        </button>

                                        <button
                                            disabled={isVisibilityLoading}
                                            onClick={() => handleToggleVisibility('private')}
                                            className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${currentQuiz.visibility === 'private'
                                                ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                                : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700'
                                                }`}
                                        >
                                            <div className={`p-3 rounded-2xl ${currentQuiz.visibility === 'private' ? 'bg-red-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                                                <Lock className="h-6 w-6" />
                                            </div>
                                            <div className="text-center">
                                                <div className="font-bold">{t.visibility.private}</div>
                                                <div className="text-xs opacity-70">{t.visibility.privateDesc}</div>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {currentQuiz.visibility === 'private' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-3xl border border-amber-100 dark:border-amber-800 space-y-4"
                                    >
                                        <div className="flex items-center gap-3 text-amber-700 dark:text-amber-400 font-bold">
                                            <Key className="h-5 w-5" />
                                            {t.visibility.accessCode}
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                readOnly
                                                value={currentQuiz.accessCode || (language === 'vi' ? "Chưa có mã" : "No code")}
                                                className="flex-1 bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-lg font-mono tracking-widest text-center"
                                            />
                                            <Button
                                                variant="outline"
                                                onClick={async () => {
                                                    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
                                                    await updateQuizVisibility(currentQuiz.id!, 'private', code);
                                                    await refreshQuiz();
                                                    toast.success("Đã tạo mã truy cập mới!");
                                                }}
                                                className="rounded-xl px-6 border-amber-300 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                                            >
                                                {t.visibility.generateCode}
                                            </Button>
                                        </div>
                                        <p className="text-xs text-amber-600/70 dark:text-amber-400/70 text-center italic">
                                            {language === 'vi' ? 'Gửi mã này hoặc đường dẫn riêng tư dưới đây cho người học:' : 'Send this code or the private link below to learners:'}
                                        </p>
                                        <div className="flex gap-2">
                                            <input
                                                readOnly
                                                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/courses/${currentQuiz.id}?code=${currentQuiz.accessCode || ''}`}
                                                className="flex-1 bg-white/50 dark:bg-black/20 border border-amber-200/50 dark:border-amber-800/50 rounded-xl px-3 py-2 text-[10px] font-mono truncate"
                                            />
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    const link = `${window.location.origin}/courses/${currentQuiz.id}?code=${currentQuiz.accessCode || ''}`;
                                                    navigator.clipboard.writeText(link);
                                                    toast.success(language === 'vi' ? "Đã sao chép link riêng tư!" : "Private link copied!");
                                                }}
                                                className="rounded-lg h-9 w-9 p-0"
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        ) : activeTab === 'analytics' ? (
                            <motion.div
                                key="analytics"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-6"
                            >
                                {isAnalyticsLoading ? (
                                    <div className="text-center py-20 text-zinc-400">{t.common.loading}</div>
                                ) : results.length === 0 ? (
                                    <div className="text-center py-20 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl text-zinc-400">
                                        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                        <p>{t.analytics.noData}</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Stats Cards */}
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            <div className="p-4 bg-sky-50 dark:bg-sky-950/20 rounded-2xl border border-sky-100 dark:border-sky-900/30">
                                                <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 mb-2">
                                                    <Users2 className="h-4 w-4" />
                                                    <span className="text-xs font-bold uppercase">{t.analytics.visitors}</span>
                                                </div>
                                                <div className="text-2xl font-black">{results.length}</div>
                                            </div>
                                            <div 
                                                className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/30 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors group"
                                                onClick={() => {
                                                    setShowViewersList(!showViewersList);
                                                    if (!showViewersList) loadViewers();
                                                }}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                                        <Eye className="h-4 w-4" />
                                                        <span className="text-xs font-bold uppercase">{language === 'vi' ? 'Người xem' : 'Views'}</span>
                                                    </div>
                                                    <ExternalLink className="h-3 w-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                                <div className="text-2xl font-black">{currentQuiz?.views || 0}</div>
                                            </div>
                                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                                                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
                                                    <Target className="h-4 w-4" />
                                                    <span className="text-xs font-bold uppercase">{t.analytics.averageScore}</span>
                                                </div>
                                                <div className="text-2xl font-black">
                                                    {results.length > 0 ? (Math.round(results.reduce((acc, r) => acc + (r.score / r.totalQuestions) * 10, 0) / results.length * 10) / 10) : 0}/10
                                                </div>
                                            </div>
                                            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/30 col-span-2 md:col-span-1">
                                                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                                                    <Trophy className="h-4 w-4" />
                                                    <span className="text-xs font-bold uppercase">{t.analytics.highestScore}</span>
                                                </div>
                                                <div className="text-2xl font-black">
                                                    {results.length > 0 ? (Math.max(...results.map(r => Math.round((r.score / r.totalQuestions) * 100) / 10))) : 0}/10
                                                </div>
                                            </div>
                                        </div>

                                        {showViewersList && (
                                            <motion.div 
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="space-y-4"
                                            >
                                                <div className="flex items-center justify-between px-2">
                                                    <h3 className="text-sm font-bold text-blue-500 uppercase tracking-wider">
                                                        {language === 'vi' ? 'Danh sách người xem' : 'Viewer List'}
                                                    </h3>
                                                    <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setShowViewersList(false)}>
                                                        {language === 'vi' ? 'Đóng' : 'Close'}
                                                    </Button>
                                                </div>
                                                <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 overflow-hidden">
                                                    {isViewersLoading ? (
                                                        <div className="p-10 text-center text-zinc-400 text-xs italic">Đang tải...</div>
                                                    ) : viewers.length === 0 ? (
                                                        <div className="p-10 text-center text-zinc-400 text-xs italic">Chưa có ai xem bài này</div>
                                                    ) : (
                                                        <table className="w-full text-sm text-left">
                                                            <thead className="bg-blue-100/50 dark:bg-blue-900/30 text-blue-600 font-bold">
                                                                <tr>
                                                                    <th className="px-4 py-3">#</th>
                                                                    <th className="px-4 py-3">{t.analytics.user}</th>
                                                                    <th className="px-4 py-3 text-right">{language === 'vi' ? 'Thời gian' : 'Time'}</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-blue-100 dark:divide-blue-900/30">
                                                                {viewers.map((v, i) => (
                                                                    <tr key={v.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors">
                                                                        <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{i + 1}</td>
                                                                        <td className="px-4 py-3">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-[10px] font-bold text-blue-600">
                                                                                    {v.userName.charAt(0)}
                                                                                </div>
                                                                                <div>
                                                                                    <div className="font-bold text-xs">{v.userName}</div>
                                                                                    <div className="text-[10px] text-zinc-400">{v.userEmail}</div>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right text-zinc-400 text-[10px]">
                                                                            {formatDate(v.viewedAt)}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* Ranking Table */}
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider px-2">
                                                {t.analytics.ranking}
                                            </h3>
                                            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-bold">
                                                        <tr>
                                                            <th className="px-4 py-3">#</th>
                                                            <th className="px-4 py-3">{t.analytics.user}</th>
                                                            <th className="px-4 py-3 text-right">{t.analytics.score}</th>
                                                            <th className="px-4 py-3 text-right">{t.analytics.date}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y dark:divide-zinc-800">
                                                        {[...results]
                                                            .sort((a, b) => (b.score / b.totalQuestions) - (a.score / a.totalQuestions))
                                                            .map((result, index) => (
                                                                <tr key={result.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                                                                    <td className="px-4 py-3 font-bold text-zinc-400">{index + 1}</td>
                                                                    <td className="px-4 py-3">
                                                                        <div className="font-bold">{result.userName}</div>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right">
                                                                        <span className={`px-2 py-1 rounded-lg font-mono font-bold ${
                                                                            (result.score / result.totalQuestions) >= 0.8 ? 'bg-emerald-100 text-emerald-600' :
                                                                            (result.score / result.totalQuestions) >= 0.5 ? 'bg-amber-100 text-amber-600' :
                                                                            'bg-red-100 text-red-600'
                                                                        }`}>
                                                                            {result.score}/{result.totalQuestions}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right text-zinc-400 text-xs">
                                                                        {formatDate(result.createdAt)}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="reports"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-6"
                            >
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <Flag className="h-5 w-5 text-red-500" />
                                    {language === 'vi' ? 'Báo cáo lỗi từ người dùng' : 'User Reports'} ({reports.length})
                                </h3>

                                {isReportsLoading ? (
                                    <div className="text-center py-20 text-zinc-400">{t.common.loading}</div>
                                ) : reports.length === 0 ? (
                                    <div className="text-center py-20 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl text-zinc-400">
                                        <Check className="h-12 w-12 mx-auto mb-4 opacity-20 text-green-500" />
                                        <p>{language === 'vi' ? 'Tuyệt vời! Không có báo cáo lỗi nào.' : 'Great! No reports found.'}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {reports.map((report) => (
                                            <div key={report.id} className="p-5 bg-red-50/50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${report.status === 'resolved' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                                                            {report.status === 'resolved' ? <Check className="h-4 w-4 text-green-600" /> : <User className="h-4 w-4 text-red-600" />}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold">{report.userName}</div>
                                                            <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {formatDate(report.createdAt)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 text-[10px] font-bold rounded-lg text-sky-600 hover:bg-sky-50 gap-1"
                                                            onClick={() => {
                                                                const q = currentQuiz?.questions.find(q => q.id === report.questionId) || currentQuiz?.questions[report.questionIndex];
                                                                if (q) {
                                                                    setEditingReportId(report.id || null);
                                                                    setResolvingAnswer(q.correctAnswer || []);
                                                                } else {
                                                                    toast.error(language === 'vi' ? "Không tìm thấy câu hỏi này trong bài tập" : "Could not find this question in the quiz");
                                                                }
                                                            }}
                                                        >
                                                            <Check className="h-3 w-3" /> {language === 'vi' ? 'Sửa đáp án nhanh' : 'Quick fix answer'}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 text-[10px] font-bold rounded-lg text-zinc-600 hover:bg-zinc-100 gap-1"
                                                            onClick={() => {
                                                                if (report.quizId) {
                                                                    const qId = report.questionId || currentQuiz?.questions[report.questionIndex]?.id;
                                                                    router.push(`/questionbuilder?edit=${report.quizId}${qId ? `&questionId=${qId}` : ''}`);
                                                                }
                                                            }}
                                                        >
                                                            <Edit className="h-3 w-3" /> {language === 'vi' ? 'Sửa toàn bộ' : 'Full Edit'}
                                                        </Button>
                                                        {report.status === 'pending' && (
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline" 
                                                                className="h-7 text-[10px] font-bold rounded-lg border-green-200 text-green-600 hover:bg-green-50"
                                                                onClick={() => report.id && handleResolveReport(report.id)}
                                                            >
                                                                {language === 'vi' ? 'Đã xử lý' : 'Resolve'}
                                                            </Button>
                                                        )}
                                                        <div className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider ${report.status === 'resolved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                            {report.status}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-3">
                                                    <div className="p-3 bg-white dark:bg-zinc-800 rounded-xl border border-red-50 dark:border-zinc-700">
                                                        <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">{language === 'vi' ? 'Câu hỏi' : 'Question'} #{report.questionIndex + 1}</p>
                                                        <p className="text-sm italic text-zinc-600 dark:text-zinc-400">"{report.questionText}"</p>
                                                    </div>
                                                    
                                                    <div>
                                                        <p className="text-[10px] font-bold text-red-400 uppercase mb-1">{language === 'vi' ? 'Nội dung báo cáo' : 'Report content'}</p>
                                                        <p className="text-sm font-medium">{report.reason}</p>
                                                    </div>

                                                    {editingReportId === report.id && (
                                                        <div className="mt-4 p-4 bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-100 dark:border-sky-800 animate-in fade-in slide-in-from-top-2">
                                                            <div className="flex justify-between items-center mb-3">
                                                                <p className="text-[10px] font-bold text-sky-600 uppercase">{language === 'vi' ? 'Sửa đáp án nhanh' : 'Quick fix answer'}</p>
                                                                <div className="text-[10px] bg-white dark:bg-zinc-800 px-2 py-0.5 rounded border border-sky-100 dark:border-zinc-700">
                                                                    <span className="text-zinc-400">{language === 'vi' ? 'Hiện tại' : 'Current'}: </span>
                                                                    <span className="font-bold text-sky-500">
                                                                        {(currentQuiz?.questions.find(q => q.id === report.questionId) || currentQuiz?.questions[report.questionIndex])?.correctAnswer?.join(", ") || (language === 'vi' ? 'Chưa có' : 'None')}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="space-y-2 mb-4 max-h-[200px] overflow-y-auto pr-2">
                                                                {(() => {
                                                                    const q = currentQuiz?.questions.find(q => q.id === report.questionId) || currentQuiz?.questions[report.questionIndex];
                                                                    if (!q) return null;
                                                                    
                                                                    const isMultiple = q.type === 'multiple';
                                                                    const isOpen = q.type === 'open';
                                                                    
                                                                    if (isOpen) {
                                                                        return (
                                                                            <Textarea 
                                                                                placeholder={language === 'vi' ? "Nhập đáp án đúng mới..." : "Enter new correct answer..."}
                                                                                value={resolvingAnswer[0] || ""}
                                                                                onChange={(e) => setResolvingAnswer([e.target.value])}
                                                                                className="bg-white dark:bg-zinc-800 border-sky-100"
                                                                            />
                                                                        );
                                                                    }

                                                                    return q.options.map((opt, i) => {
                                                                        const isSelected = resolvingAnswer.includes(opt);
                                                                        return (
                                                                            <label key={i} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all border ${isSelected ? 'bg-sky-600 text-white border-sky-600' : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-sky-300'}`}>
                                                                                <input 
                                                                                    type={isMultiple ? "checkbox" : "radio"}
                                                                                    name={`resolving-${report.id}`}
                                                                                    checked={isSelected}
                                                                                    onChange={(e) => {
                                                                                        if (isMultiple) {
                                                                                            if (e.target.checked) setResolvingAnswer([...resolvingAnswer, opt]);
                                                                                            else setResolvingAnswer(resolvingAnswer.filter(a => a !== opt));
                                                                                        } else {
                                                                                            setResolvingAnswer([opt]);
                                                                                        }
                                                                                    }}
                                                                                    className="h-4 w-4 text-white focus:ring-0"
                                                                                />
                                                                                <span className="text-sm font-medium">{opt}</span>
                                                                            </label>
                                                                        );
                                                                    });
                                                                })()}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button 
                                                                    size="sm" 
                                                                    className="h-9 rounded-xl px-4 bg-sky-600 hover:bg-sky-700 text-[11px] font-black shadow-lg shadow-sky-500/20" 
                                                                    onClick={() => handleQuickResolve(report)}
                                                                    disabled={isReportsLoading}
                                                                >
                                                                    {isReportsLoading ? t.common.loading : (language === 'vi' ? 'Cập nhật & Xử lý' : 'Update & Resolve')}
                                                                </Button>
                                                                <Button size="sm" variant="ghost" className="h-9 rounded-xl text-[11px] font-bold" onClick={() => setEditingReportId(null)}>
                                                                    {t.common.cancel}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {report.status === 'resolved' && report.resolvedByName && (
                                                        <div className="mt-2 flex items-center gap-2 text-[10px] text-green-600 font-bold">
                                                            <CheckCircle className="h-3 w-3" />
                                                            {language === 'vi' ? 'Đã sửa bởi' : 'Resolved by'}: {report.resolvedByName}
                                                            {report.resolvedAt && (
                                                                <span className="text-zinc-400 font-medium"> • {formatDate(report.resolvedAt)}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>,
        document.body
    );
}
