"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getInvitation, acceptQuizInvitation, QuizInvitation } from "@/services/quizService";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { toast } from "sonner";
import { BookOpen, UserPlus, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AcceptInvitePage() {
    const { id } = useParams();
    const router = useRouter();
    const { user, loading: authLoading, login } = useAuth();
    const { t, language } = useLanguage();
    const [invitation, setInvitation] = useState<QuizInvitation | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        async function fetchInv() {
            try {
                const inv = await getInvitation(id as string);
                if (!inv) {
                    setError(language === 'vi' ? "Lời mời không tồn tại hoặc đã hết hạn." : "Invitation does not exist or has expired.");
                } else if (inv.status === 'accepted') {
                    setError(language === 'vi' ? "Lời mời này đã được chấp nhận trước đó." : "This invitation has already been accepted.");
                } else {
                    setInvitation(inv);
                }
            } catch (err) {
                console.error(err);
                setError(language === 'vi' ? "Lỗi khi tải thông tin lời mời." : "Error loading invitation details.");
            } finally {
                setLoading(false);
            }
        }

        fetchInv();
    }, [id]);

    const handleAccept = async () => {
        if (!user || !invitation?.id) return;

        // Verify email match
        if (user.email?.toLowerCase() !== invitation.inviteeEmail.toLowerCase()) {
            toast.error(language === 'vi'
                ? `Lời mời này dành cho ${invitation.inviteeEmail}. Bạn đang đăng nhập bằng ${user.email}.`
                : `This invitation is for ${invitation.inviteeEmail}. You are logged in as ${user.email}.`
            );
            return;
        }

        setProcessing(true);
        try {
            const quizId = await acceptQuizInvitation(invitation.id, user.email);
            toast.success(language === 'vi' ? "Chào mừng cộng tác viên mới!" : "Welcome new collaborator!");
            router.push(`/questionbuilder?edit=${quizId}`);
        } catch (err: any) {
            toast.error(err.message || (language === 'vi' ? "Lỗi khi chấp nhận lời mời" : "Error accepting invitation"));
        } finally {
            setProcessing(false);
        }
    };

    if (loading || authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-indigo-50/30 dark:bg-zinc-950">
                <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-indigo-50/30 dark:bg-zinc-950 p-4">
                <Card className="w-full max-w-md border-red-100 dark:border-red-900/30">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mb-4">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-xl text-red-600">{language === 'vi' ? 'Opps! Lỗi' : 'Opps! Error'}</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Button onClick={() => router.push("/")}>{language === 'vi' ? 'Về trang chủ' : 'Go home'}</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-indigo-50/30 dark:bg-zinc-950 p-4">
                <Card className="w-full max-w-md shadow-2xl rounded-3xl overflow-hidden border-none bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 transform rotate-6">
                            <BookOpen className="h-8 w-8" />
                        </div>
                        <CardTitle className="text-2xl font-black">{language === 'vi' ? 'Bạn được mời cộng tác!' : 'You are invited to collaborate!'}</CardTitle>
                        <CardDescription className="text-base mt-2">
                            {language === 'vi' ? 'Hãy đăng nhập để chấp nhận lời mời chỉnh sửa khóa học' : 'Please login to accept the invitation to edit course'}
                            <span className="block font-bold mt-1 text-zinc-900 dark:text-zinc-100">"{invitation?.quizTitle}"</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 pb-8 px-8">
                        <Button onClick={login} className="w-full h-12 rounded-2xl text-lg font-bold shadow-lg shadow-indigo-500/20">
                            {language === 'vi' ? 'Đăng nhập để tiếp tục' : 'Login to continue'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-indigo-50/30 dark:bg-zinc-950 p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <Card className="shadow-2xl rounded-[2.5rem] overflow-hidden border-none bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
                    <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
                    <CardHeader className="text-center pb-2 pt-10">
                        <div className="mx-auto w-20 h-20 bg-indigo-50 dark:bg-indigo-950 text-indigo-500 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                            <UserPlus className="h-10 w-10" />
                        </div>
                        <CardTitle className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">{language === 'vi' ? 'Lời mời cộng tác' : 'Collaboration Invite'}</CardTitle>
                        <CardDescription className="text-base mt-4 px-4 line-clamp-2">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{invitation?.inviterName}</span> {language === 'vi' ? 'mời bạn cùng quản lý nội dung khóa học:' : 'invited you to manage course content:'}
                        </CardDescription>
                        <div className="mt-4 px-6 py-4 bg-indigo-100/50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-200/50 dark:border-indigo-800/50">
                            <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100">{invitation?.quizTitle}</h3>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-8 pb-10 px-10 space-y-4">
                        <div className="text-center space-y-2 mb-6">
                            <p className="text-sm text-zinc-500">{language === 'vi' ? 'Đăng nhập với tư cách:' : 'Logged in as:'}</p>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-700">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="text-sm font-medium">{user.email}</span>
                            </div>
                        </div>

                        <Button
                            onClick={handleAccept}
                            disabled={processing}
                            className="w-full h-14 rounded-2xl text-xl font-black shadow-xl shadow-indigo-500/25 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                        >
                            {processing ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle2 className="h-6 w-6" /> {language === 'vi' ? 'Chấp nhận & Bắt đầu' : 'Accept & Start'}
                                </>
                            )}
                        </Button>
                        <p className="text-center text-xs text-zinc-400 pt-4 px-4 leading-relaxed">
                            {language === 'vi'
                                ? 'Bằng cách chấp nhận, bạn sẽ có quyền cộng tác chỉnh sửa nội dung, câu hỏi và thông tin của khóa học này.'
                                : 'By accepting, you will have permission to collaborate on editing the content, questions, and information of this course.'
                            }
                        </p>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
