"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Shield, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function AdminLoginPage() {
    const { user, isAdmin, loading, login } = useAuth();
    const { t, language } = useLanguage();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user && isAdmin) {
            router.push("/admin/dashboard");
        }
    }, [user, isAdmin, loading, router]);

    if (loading) return <div className="min-h-screen pt-32 text-center">{t.common.loading}</div>;

    return (
        <div className="min-h-screen bg-[rgb(var(--background))] overflow-hidden relative">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-500/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-sky-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <Navbar />
            
            <main className="pt-40 px-6 flex items-center justify-center">
                <div className="w-full max-w-md animate-blur-reveal">
                    <Card className="border-none shadow-2xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl rounded-[40px] overflow-hidden">
                        <div className="h-2 bg-gradient-to-r from-red-500 via-sky-500 to-red-500 bg-[length:200%_auto] animate-gradient" />
                        <CardContent className="p-10 text-center">
                            <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner group">
                                <Shield className="h-10 w-10 text-zinc-900 dark:text-white group-hover:scale-110 transition-transform" />
                            </div>
                            
                            <h1 className="text-3xl font-black tracking-tight mb-2">
                                {language === 'vi' ? 'Khu vực quản trị' : 'Admin Portal'}
                            </h1>
                            <p className="text-[rgb(var(--muted-foreground))] mb-10">
                                {language === 'vi' 
                                    ? 'Vui lòng đăng nhập bằng tài khoản Admin để tiếp tục.' 
                                    : 'Please sign in with an Admin account to continue.'}
                            </p>

                            {!user ? (
                                <Button 
                                    onClick={login}
                                    className="w-full h-14 rounded-2xl text-lg font-bold gap-3 shadow-xl hover:shadow-2xl transition-all"
                                >
                                    {language === 'vi' ? 'Đăng nhập Admin' : 'Admin Login'}
                                    <ArrowRight className="h-5 w-5" />
                                </Button>
                            ) : !isAdmin ? (
                                <div className="space-y-6">
                                    <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-900/30 flex items-center gap-3 text-sm text-left">
                                        <AlertCircle className="h-5 w-5 shrink-0" />
                                        <p>
                                            {language === 'vi' 
                                                ? 'Tài khoản này không có quyền quản trị. Vui lòng liên hệ chủ sở hữu hệ thống.' 
                                                : 'This account does not have admin privileges. Please contact the system owner.'}
                                        </p>
                                    </div>
                                    <Button 
                                        variant="outline"
                                        onClick={() => window.location.href = "/"}
                                        className="w-full h-12 rounded-xl"
                                    >
                                        {language === 'vi' ? 'Quay về Trang chủ' : 'Back to Home'}
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-sky-500 w-full animate-progress" />
                                    </div>
                                    <p className="text-sm font-medium text-sky-500 animate-pulse">
                                        {language === 'vi' ? 'Đang chuyển hướng...' : 'Redirecting...'}
                                    </p>
                                </div>
                            )}

                            <div className="mt-10 flex items-center justify-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                <Lock className="h-3 w-3" /> Secure Admin Access
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
