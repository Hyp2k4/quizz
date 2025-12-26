"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { QuizData, Comment, getQuizComments, addQuizComment, addCommentReply, createNotification } from "@/services/quizService";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useAuth } from "@/contexts/AuthContext";
import { X, Send, MessageCircle, User, CornerDownRight, Clock, AlertCircle } from "lucide-react";
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

    useEffect(() => {
        setMounted(true);
        if (isOpen && quiz?.id) {
            loadComments();
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => { document.body.style.overflow = "unset"; };
    }, [isOpen, quiz]);

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
        if (!newComment.trim() || !quiz?.id) return;

        try {
            await addQuizComment(quiz.id, newComment, user.uid, user.displayName || "Anonymous");
            
            // Create notification for course owner
            if (quiz.userId && quiz.userId !== user.uid) {
                await createNotification({
                    userId: quiz.userId,
                    type: 'comment',
                    title: 'Bình luận mới!',
                    message: `${user.displayName || "Ai đó"} vừa bình luận trong "${quiz.title}": "${newComment.substring(0, 30)}..."`,
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

    if (!mounted || !isOpen || !quiz) return null;

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
                        <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{quiz.title}</h2>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-1">{quiz.description}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-3 text-sm font-medium">
                            <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">
                                {quiz.questions.length} câu hỏi
                            </span>
                            {quiz.questions.filter(q => q.type !== 'open' && q.correctAnswer.length === 0).length > 0 && (
                                <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center gap-1.5 border border-amber-200 dark:border-amber-800 animate-pulse">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    {quiz.questions.filter(q => q.type !== 'open' && q.correctAnswer.length === 0).length} câu thiếu đáp án
                                </span>
                            )}
                            <span className="text-zinc-400">Tác giả: {quiz.authorName || "Ẩn danh"}</span>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Content - Comments */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    <div className="space-y-4">
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
                    </div>
                </div>
            </motion.div>
        </div>,
        document.body
    );
}
