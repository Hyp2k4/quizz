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
    updateQuizVisibility
} from "@/services/quizService";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useAuth } from "@/contexts/AuthContext";
import { X, Send, MessageCircle, User, CornerDownRight, Clock, AlertCircle, Users, UserPlus, UserMinus, Copy, Check, Lock, Globe, Key } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface CourseDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    quiz: QuizData | null;
}

export function CourseDetailsModal({ isOpen, onClose, quiz }: CourseDetailsModalProps) {
    const { user, login } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<'comments' | 'collaboration' | 'visibility'>('comments');
    const [collabEmail, setCollabEmail] = useState("");
    const [currentQuiz, setCurrentQuiz] = useState<QuizData | null>(quiz);
    const [isCollabLoading, setIsCollabLoading] = useState(false);
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [isVisibilityLoading, setIsVisibilityLoading] = useState(false);

    const isOwner = user && currentQuiz?.userId === user.uid;

    useEffect(() => {
        setMounted(true);
        if (isOpen && quiz?.id) {
            setCurrentQuiz(quiz);
            loadComments();
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => { document.body.style.overflow = "unset"; };
    }, [isOpen, quiz]);

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

    const handleAddComment = async () => {
        if (!user) {
            toast.error("Vui lòng đăng nhập để bình luận");
            login();
            return;
        }
        if (!newComment.trim() || !currentQuiz?.id) return;

        try {
            await addQuizComment(currentQuiz.id, newComment, user.uid, user.displayName || "Anonymous");

            // Create notification for course owner
            if (currentQuiz.userId && currentQuiz.userId !== user.uid) {
                await createNotification({
                    userId: currentQuiz.userId,
                    type: 'comment',
                    title: 'Bình luận mới!',
                    message: `${user.displayName || "Ai đó"} vừa bình luận trong "${currentQuiz.title}": "${newComment.substring(0, 30)}..."`,
                    link: `#`
                });
            }

            setNewComment("");
            loadComments();
            toast.success("Đã gửi bình luận!");
        } catch (error) {
            toast.error("Lỗi khi gửi bình luận");
        }
    };

    const handleAddReply = async (commentId: string) => {
        if (!user) {
            toast.error("Vui lòng đăng nhập để phản hồi");
            login();
            return;
        }
        if (!replyText.trim()) return;

        try {
            await addCommentReply(commentId, replyText, user.uid, user.displayName || "Anonymous");

            // Notification logic for reply could be added here if needed (e.g. notify comment owner)

            setReplyText("");
            setReplyingTo(null);
            loadComments();
            toast.success("Đã gửi phản hồi!");
        } catch (error) {
            toast.error("Lỗi khi gửi phản hồi");
        }
    };

    const handleInviteCollab = async () => {
        if (!currentQuiz?.id || !collabEmail.trim() || !user) return;
        if (!collabEmail.includes("@")) {
            toast.error("Email không hợp lệ");
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

            toast.success(`Đã tạo lời mời cho ${collabEmail}`);
            setCollabEmail("");
        } catch (error) {
            toast.error("Lỗi khi tạo lời mời");
        } finally {
            setIsCollabLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Đã sao chép link mời!");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRemoveCollab = async (email: string) => {
        if (!currentQuiz?.id) return;

        try {
            await removeCollaborator(currentQuiz.id, email);
            toast.success(`Đã xóa ${email} khỏi danh sách cộng tác`);
            await refreshQuiz();
        } catch (error) {
            toast.error("Lỗi khi xóa người cộng tác");
        }
    };

    const handleToggleVisibility = async (visibility: 'public' | 'private') => {
        if (!currentQuiz?.id) return;
        setIsVisibilityLoading(true);
        try {
            await updateQuizVisibility(currentQuiz.id, visibility);
            await refreshQuiz();
            toast.success(`Đã chuyển khóa học sang chế độ ${visibility === 'public' ? 'Công khai' : 'Riêng tư'}`);
        } catch (error) {
            toast.error("Lỗi khi thay đổi trạng thái hiển thị");
        } finally {
            setIsVisibilityLoading(false);
        }
    };

    if (!mounted || !isOpen || !currentQuiz) return null;

    const formatDate = (date: any) => {
        if (!date) return "";
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString("vi-VN", { hour: '2-digit', minute: '2-digit' });
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
                <div className="p-6 border-b dark:border-zinc-800 flex justify-between items-start bg-indigo-50/50 dark:bg-indigo-950/10">
                    <div>
                        <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{currentQuiz.title}</h2>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-1">{currentQuiz.description}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-3 text-sm font-medium">
                            <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">
                                {currentQuiz.questions.length} câu hỏi
                            </span>
                            {currentQuiz.questions.filter(q => q.type !== 'open' && q.correctAnswer.length === 0).length > 0 && (
                                <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center gap-1.5 border border-amber-200 dark:border-amber-800 animate-pulse">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    {currentQuiz.questions.filter(q => q.type !== 'open' && q.correctAnswer.length === 0).length} câu thiếu đáp án
                                </span>
                            )}
                            <span className="text-zinc-400">Tác giả: {currentQuiz.authorName || "Ẩn danh"}</span>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Tabs for Owner */}
                {isOwner && (
                    <div className="flex border-b dark:border-zinc-800 px-6 bg-white dark:bg-zinc-900">
                        <button
                            onClick={() => setActiveTab('comments')}
                            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'comments'
                                    ? 'border-indigo-500 text-indigo-500'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-700'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <MessageCircle className="h-4 w-4" /> Bình luận
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('collaboration')}
                            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'collaboration'
                                    ? 'border-indigo-500 text-indigo-500'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-700'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <Users className="h-4 w-4" /> Cộng tác
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('visibility')}
                            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'visibility'
                                    ? 'border-indigo-500 text-indigo-500'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-700'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <Lock className="h-4 w-4" /> Hiển thị
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
                                    <MessageCircle className="h-5 w-5 text-indigo-500" />
                                    Nhận xét từ cộng đồng ({comments.length})
                                </h3>

                                {/* Comment Input */}
                                <div className="flex gap-3">
                                    <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                                        <User className="h-5 w-5 text-zinc-400" />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <Textarea
                                            placeholder="Viết nhận xét của bạn..."
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            className="min-h-[80px] rounded-2xl resize-none bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800"
                                        />
                                        <div className="flex justify-end">
                                            <Button onClick={handleAddComment} size="sm" className="rounded-full gap-2 px-6">
                                                Gửi <Send className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Comments List */}
                                <div className="space-y-6 mt-8">
                                    {isLoading ? (
                                        <div className="text-center py-10 text-zinc-400">Đang tải nhận xét...</div>
                                    ) : comments.length === 0 ? (
                                        <div className="text-center py-10 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl text-zinc-400">
                                            Chưa có nhận xét nào. Hãy là người đầu tiên!
                                        </div>
                                    ) : (
                                        comments.map(comment => (
                                            <div key={comment.id} className="group">
                                                <div className="flex gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
                                                        <User className="h-5 w-5 text-indigo-600" />
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
                                                                className="text-xs font-bold text-indigo-500 hover:text-indigo-600 transition-colors"
                                                            >
                                                                Phản hồi
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
                                                                        Phản hồi cho {comment.userName}
                                                                    </div>
                                                                    <Textarea
                                                                        placeholder="Viết phản hồi của bạn..."
                                                                        value={replyText}
                                                                        onChange={(e) => setReplyText(e.target.value)}
                                                                        className="min-h-[60px] rounded-xl text-sm"
                                                                    />
                                                                    <div className="flex justify-end gap-2 text-xs">
                                                                        <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>Hủy</Button>
                                                                        <Button onClick={() => handleAddReply(comment.id!)} size="sm" className="rounded-full px-4">Gửi phản hồi</Button>
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
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-800">
                                    <h3 className="text-lg font-bold flex items-center gap-2 text-indigo-700 dark:text-indigo-400 mb-2">
                                        <UserPlus className="h-5 w-5" />
                                        Mời người cộng tác
                                    </h3>
                                    <p className="text-sm text-indigo-600/70 dark:text-indigo-400/70 mb-4">
                                        Người cộng tác có thể chỉnh sửa câu hỏi, thay đổi tiêu đề và quản lý nội dung khóa học này.
                                    </p>
                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            placeholder="Nhập email người cần mời..."
                                            value={collabEmail}
                                            onChange={(e) => setCollabEmail(e.target.value)}
                                            className="flex-1 bg-white dark:bg-zinc-800 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 ring-indigo-500/20"
                                        />
                                        <Button
                                            onClick={handleInviteCollab}
                                            disabled={isCollabLoading || !collabEmail}
                                            className="rounded-xl px-6"
                                        >
                                            {isCollabLoading ? "Đang tạo..." : "Tạo lời mời"}
                                        </Button>
                                    </div>

                                    <AnimatePresence>
                                        {inviteLink && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                className="p-4 bg-white dark:bg-zinc-800 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800/50 overflow-hidden"
                                            >
                                                <p className="text-xs font-bold text-indigo-500 mb-2 uppercase tracking-wide">Link mời cộng tác:</p>
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
                                                <p className="text-[10px] text-zinc-400 mt-2 italic">* Chỉ người dùng có email khớp với lời mời mới có thể chấp nhận.</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider px-2">
                                        Danh sách cộng tác viên ({currentQuiz.collaborators?.length || 0})
                                    </h3>
                                    <div className="space-y-2">
                                        {(!currentQuiz.collaborators || currentQuiz.collaborators.length === 0) ? (
                                            <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-800/30 rounded-3xl border-2 border-dashed border-zinc-100 dark:border-zinc-800 text-zinc-400 text-sm">
                                                Chưa có người cộng tác nào.
                                            </div>
                                        ) : (
                                            currentQuiz.collaborators.map(email => (
                                                <div key={email} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 group hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
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
                        ) : (
                            <motion.div
                                key="visibility"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-6"
                            >
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider px-2">Cài đặt hiển thị</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            disabled={isVisibilityLoading}
                                            onClick={() => handleToggleVisibility('public')}
                                            className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${currentQuiz.visibility !== 'private'
                                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'
                                                    : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700'
                                                }`}
                                        >
                                            <div className={`p-3 rounded-2xl ${currentQuiz.visibility !== 'private' ? 'bg-indigo-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                                                <Globe className="h-6 w-6" />
                                            </div>
                                            <div className="text-center">
                                                <div className="font-bold">Công khai</div>
                                                <div className="text-xs opacity-70">Ai cũng có thể tìm và xem</div>
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
                                                <div className="font-bold">Riêng tư</div>
                                                <div className="text-xs opacity-70">Chỉ chia sẻ qua mã bí mật</div>
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
                                            Mã truy cập riêng tư
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                readOnly
                                                value={currentQuiz.accessCode || "Chưa có mã"}
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
                                                Tạo mã mới
                                            </Button>
                                        </div>
                                        <p className="text-xs text-amber-600/70 dark:text-amber-400/70 text-center italic">
                                            Gửi mã này hoặc đường dẫn riêng tư dưới đây cho người học:
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
                                                    toast.success("Đã sao chép link riêng tư!");
                                                }}
                                                className="rounded-lg h-9 w-9 p-0"
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </motion.div>
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
