"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import {
    getAllUsers,
    getAllQuizzesAdmin,
    getSystemStats,
    updateUserRole,
    deleteUserAdmin,
    ensureOpenGradingConfigAdmin,
    getOpenGradingConfigAdmin,
    updateOpenGradingConfigAdmin,
    UserProfile
} from "@/services/adminService";
import { deleteQuiz, QuizData } from "@/services/quizService";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
    Users,
    BookOpen,
    BarChart3,
    Shield,
    ShieldAlert,
    Trash2,
    ExternalLink,
    Search,
    Filter,
    MoreVertical,
    CheckCircle2,
    XCircle,
    UserCircle
} from "lucide-react";
import { toast } from "sonner";
import { OpenGradingConfig } from "@/utils/openGrading";

export default function AdminDashboardPage() {
    const { user, isAdmin, loading: authLoading } = useAuth();
    const { t, language } = useLanguage();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'quizzes' | 'grading'>('stats');
    const [stats, setStats] = useState<any>(null);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [quizzes, setQuizzes] = useState<QuizData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [openCfg, setOpenCfg] = useState<OpenGradingConfig | null>(null);
    const [savingCfg, setSavingCfg] = useState(false);

    useEffect(() => {
        if (!authLoading && (!user || !isAdmin)) {
            router.push("/admin/login");
            return;
        }

        if (isAdmin) fetchData();
    }, [user, isAdmin, authLoading, router]);

    const fetchData = async () => {
        setLoading(true);
        try {
            await ensureOpenGradingConfigAdmin();
            const [s, u, q] = await Promise.all([
                getSystemStats(),
                getAllUsers(),
                getAllQuizzesAdmin()
            ]);
            setStats(s);
            setUsers(u);
            setQuizzes(q);

            // Load grading config (admin-only)
            try {
                const cfg = await getOpenGradingConfigAdmin();
                setOpenCfg(cfg);
            } catch (e) {
                console.error(e);
            }
        } catch (error) {
            console.error("Error fetching admin data:", error);
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    const handleRoleUpdate = async (uid: string, currentRole: string) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        try {
            await updateUserRole(uid, newRole);
            toast.success(`User role updated to ${newRole}`);
            fetchData();
        } catch (error) {
            toast.error("Failed to update role");
        }
    };

    const handleDeleteUser = async (uid: string) => {
        if (!confirm(t.admin.confirmDelete)) return;
        try {
            await deleteUserAdmin(uid);
            toast.success("User profile deleted from Firestore");
            fetchData();
        } catch (error) {
            toast.error("Failed to delete user");
        }
    };

    const handleDeleteQuiz = async (id: string) => {
        if (!confirm(t.admin.confirmDelete)) return;
        try {
            await deleteQuiz(id);
            toast.success("Quiz deleted");
            fetchData();
        } catch (error) {
            toast.error("Failed to delete quiz");
        }
    };

    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredQuizzes = quizzes.filter(q =>
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.authorName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (authLoading || !isAdmin) return <div className="min-h-screen pt-32 text-center">{t.common.loading}</div>;

    return (
        <div className="min-h-screen bg-[rgb(var(--background))] pb-20">
            <Navbar />

            <main className="pt-32 px-6 max-w-7xl mx-auto animate-blur-reveal">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-red-500 text-white rounded-xl shadow-lg shadow-red-500/20">
                                <Shield className="h-6 w-6" />
                            </div>
                            <h1 className="text-4xl font-black tracking-tight">{t.admin.title}</h1>
                        </div>
                        <p className="text-[rgb(var(--muted-foreground))]">
                            {language === 'vi' ? 'Quản lý toàn bộ hệ thống và người dùng' : 'Manage the entire system and users'}
                        </p>
                    </div>

                    <div className="flex bg-[rgb(var(--card))] p-1 rounded-2xl border border-[rgb(var(--border))] shadow-sm">
                        <button
                            onClick={() => setActiveTab('stats')}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'stats' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                        >
                            {t.admin.stats}
                        </button>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                        >
                            {t.admin.users}
                        </button>
                        <button
                            onClick={() => setActiveTab('quizzes')}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'quizzes' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                        >
                            {t.admin.quizzes}
                        </button>
                        <button
                            onClick={() => setActiveTab('grading')}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'grading' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                        >
                            {language === 'vi' ? 'Chấm tự luận' : 'Open grading'}
                        </button>
                        <button
                            onClick={() => router.push('/admin/chat')}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800`}
                        >
                            {language === 'vi' ? 'Quản lý Chat' : 'Chat Management'}
                        </button>
                    </div>
                </div>

                {/* Content */}
                {activeTab === 'stats' && stats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        <Card className="border-none bg-gradient-to-br from-sky-500 to-sky-600 text-white rounded-[32px] overflow-hidden relative group">
                            <Users className="absolute right-[-20px] top-[-20px] h-40 w-40 opacity-10 group-hover:rotate-12 transition-transform duration-500" />
                            <CardContent className="p-8">
                                <p className="text-sky-100 font-bold uppercase tracking-wider text-xs mb-2">{t.admin.totalUsers}</p>
                                <h3 className="text-5xl font-black">{stats.totalUsers}</h3>
                                <div className="mt-4 flex items-center gap-2 text-sm text-sky-100/80">
                                    <div className="h-1 w-20 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-white w-[60%]" />
                                    </div>
                                    Active accounts
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-[32px] overflow-hidden relative group">
                            <BookOpen className="absolute right-[-20px] top-[-20px] h-40 w-40 opacity-10 group-hover:rotate-12 transition-transform duration-500" />
                            <CardContent className="p-8">
                                <p className="text-emerald-100 font-bold uppercase tracking-wider text-xs mb-2">{t.admin.totalQuizzes}</p>
                                <h3 className="text-5xl font-black">{stats.totalQuizzes}</h3>
                                <div className="mt-4 flex items-center gap-2 text-sm text-emerald-100/80">
                                    <div className="h-1 w-20 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-white w-[85%]" />
                                    </div>
                                    Shared knowledge
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-[32px] overflow-hidden relative group">
                            <BarChart3 className="absolute right-[-20px] top-[-20px] h-40 w-40 opacity-10 group-hover:rotate-12 transition-transform duration-500" />
                            <CardContent className="p-8">
                                <p className="text-amber-100 font-bold uppercase tracking-wider text-xs mb-2">{t.admin.totalAttempts}</p>
                                <h3 className="text-5xl font-black">{stats.totalResults}</h3>
                                <div className="mt-4 flex items-center gap-2 text-sm text-amber-100/80">
                                    <div className="h-1 w-20 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-white w-[40%]" />
                                    </div>
                                    Learning progress
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'grading' && (
                    <div className="max-w-3xl">
                        <Card className="border-none bg-white dark:bg-zinc-900/70 rounded-[32px] shadow-xl">
                            <CardContent className="p-8 space-y-8">
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-black">
                                        {language === 'vi' ? 'Cấu hình chấm câu tự luận' : 'Open-ended grading settings'}
                                    </h2>
                                    <p className="text-sm text-[rgb(var(--muted-foreground))]">
                                        {language === 'vi'
                                            ? 'Thiết lập mức độ “gần đúng” cho câu tự luận (áp dụng toàn hệ thống).'
                                            : 'Tune how “close enough” open answers are (system-wide).'}
                                    </p>
                                </div>

                                {!openCfg ? (
                                    <div className="text-sm text-zinc-500">{t.common.loading}</div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black uppercase tracking-widest text-zinc-400">
                                                    {language === 'vi' ? 'Chế độ' : 'Mode'}
                                                </label>
                                                <select
                                                    value={openCfg.mode}
                                                    onChange={(e) => setOpenCfg(prev => prev ? ({ ...prev, mode: e.target.value as any }) : prev)}
                                                    className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-[rgb(var(--border))] font-bold outline-none focus:ring-2 ring-sky-500/20"
                                                >
                                                    <option value="strict">{language === 'vi' ? 'Khắt khe (strict)' : 'Strict'}</option>
                                                    <option value="normal">{language === 'vi' ? 'Bình thường (normal)' : 'Normal'}</option>
                                                    <option value="lenient">{language === 'vi' ? 'Dễ (lenient)' : 'Lenient'}</option>
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-black uppercase tracking-widest text-zinc-400">
                                                    {language === 'vi' ? 'Ngưỡng đúng (match ratio)' : 'Correct threshold (match ratio)'}
                                                </label>
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="range"
                                                        min={0.1}
                                                        max={0.95}
                                                        step={0.05}
                                                        value={openCfg.matchRatioThreshold}
                                                        onChange={(e) => setOpenCfg(prev => prev ? ({ ...prev, matchRatioThreshold: Number(e.target.value) }) : prev)}
                                                        className="flex-1"
                                                    />
                                                    <span className="w-16 text-right font-mono font-black text-sky-600">
                                                        {Math.round(openCfg.matchRatioThreshold * 100)}%
                                                    </span>
                                                </div>
                                                <p className="text-xs text-[rgb(var(--muted-foreground))]">
                                                    {language === 'vi'
                                                        ? 'Tỉ lệ từ/ý khớp so với đáp án mẫu để tính là đúng.'
                                                        : 'How much should match the model answer to be considered correct.'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <label className="text-xs font-black uppercase tracking-widest text-zinc-400">
                                                    {language === 'vi' ? 'Chuẩn hoá tiếng Việt' : 'Vietnamese normalization'}
                                                </label>
                                                <label className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-[rgb(var(--border))]">
                                                    <input
                                                        type="checkbox"
                                                        checked={openCfg.ignoreDiacritics}
                                                        onChange={(e) => setOpenCfg(prev => prev ? ({ ...prev, ignoreDiacritics: e.target.checked }) : prev)}
                                                        className="w-4 h-4"
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="font-black text-sm">{language === 'vi' ? 'Bỏ dấu khi so khớp' : 'Ignore diacritics'}</p>
                                                        <p className="text-xs text-[rgb(var(--muted-foreground))] truncate">
                                                            {language === 'vi' ? 'Ví dụ: "quy dong" ≈ "quy đồng"' : 'Example: "quy dong" ≈ "quy đồng"'}
                                                        </p>
                                                    </div>
                                                </label>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-xs font-black uppercase tracking-widest text-zinc-400">
                                                    {language === 'vi' ? 'Fuzzy chính tả' : 'Typo tolerance'}
                                                </label>
                                                <label className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-[rgb(var(--border))]">
                                                    <input
                                                        type="checkbox"
                                                        checked={openCfg.enableFuzzy}
                                                        onChange={(e) => setOpenCfg(prev => prev ? ({ ...prev, enableFuzzy: e.target.checked }) : prev)}
                                                        className="w-4 h-4"
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="font-black text-sm">{language === 'vi' ? 'Cho phép sai chính tả nhẹ' : 'Allow small typos'}</p>
                                                        <p className="text-xs text-[rgb(var(--muted-foreground))]">
                                                            {language === 'vi' ? 'Chỉ áp dụng cho từ dài.' : 'Only applied to longer tokens.'}
                                                        </p>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black uppercase tracking-widest text-zinc-400">
                                                    {language === 'vi' ? 'Sai tối đa (edit distance)' : 'Max edit distance'}
                                                </label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={2}
                                                    step={1}
                                                    value={openCfg.maxEditDistance}
                                                    onChange={(e) => setOpenCfg(prev => prev ? ({ ...prev, maxEditDistance: Number(e.target.value) }) : prev)}
                                                    className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-[rgb(var(--border))] font-bold outline-none focus:ring-2 ring-sky-500/20"
                                                    disabled={!openCfg.enableFuzzy}
                                                />
                                                <p className="text-xs text-[rgb(var(--muted-foreground))]">
                                                    {language === 'vi' ? '0 = không fuzzy, 1 = sai 1 ký tự.' : '0 disables fuzzy, 1 allows 1 char off.'}
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black uppercase tracking-widest text-zinc-400">
                                                    {language === 'vi' ? 'Chỉ fuzzy với từ dài ≥' : 'Only fuzzy if token length ≥'}
                                                </label>
                                                <input
                                                    type="number"
                                                    min={3}
                                                    max={12}
                                                    step={1}
                                                    value={openCfg.minTokenLengthForFuzzy}
                                                    onChange={(e) => setOpenCfg(prev => prev ? ({ ...prev, minTokenLengthForFuzzy: Number(e.target.value) }) : prev)}
                                                    className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-[rgb(var(--border))] font-bold outline-none focus:ring-2 ring-sky-500/20"
                                                    disabled={!openCfg.enableFuzzy}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-end gap-3 pt-2">
                                            <Button
                                                variant="outline"
                                                className="rounded-2xl h-12 px-6 font-black"
                                                onClick={async () => {
                                                    try {
                                                        const cfg = await getOpenGradingConfigAdmin();
                                                        setOpenCfg(cfg);
                                                        toast.success(language === 'vi' ? "Đã tải lại cấu hình" : "Config reloaded");
                                                    } catch {
                                                        toast.error(language === 'vi' ? "Không tải được cấu hình" : "Failed to reload");
                                                    }
                                                }}
                                            >
                                                {language === 'vi' ? 'Tải lại' : 'Reload'}
                                            </Button>
                                            <Button
                                                className="rounded-2xl h-12 px-8 font-black bg-sky-600 hover:bg-sky-700"
                                                disabled={savingCfg}
                                                onClick={async () => {
                                                    if (!openCfg) return;
                                                    setSavingCfg(true);
                                                    try {
                                                        await updateOpenGradingConfigAdmin({
                                                            mode: openCfg.mode,
                                                            matchRatioThreshold: openCfg.matchRatioThreshold,
                                                            ignoreDiacritics: openCfg.ignoreDiacritics,
                                                            enableFuzzy: openCfg.enableFuzzy,
                                                            maxEditDistance: openCfg.maxEditDistance,
                                                            minTokenLengthForFuzzy: openCfg.minTokenLengthForFuzzy
                                                        });
                                                        toast.success(language === 'vi' ? "Đã lưu cấu hình chấm tự luận" : "Saved open grading config");
                                                    } catch (e) {
                                                        console.error(e);
                                                        toast.error(language === 'vi' ? "Lưu thất bại" : "Save failed");
                                                    } finally {
                                                        setSavingCfg(false);
                                                    }
                                                }}
                                            >
                                                {savingCfg ? (language === 'vi' ? 'Đang lưu...' : 'Saving...') : (language === 'vi' ? 'Lưu cấu hình' : 'Save')}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {(activeTab === 'users' || activeTab === 'quizzes') && (
                    <div className="bg-[rgb(var(--card))] rounded-[40px] border border-[rgb(var(--border))] shadow-xl overflow-hidden">
                        <div className="p-6 border-b border-[rgb(var(--border))] bg-zinc-50/50 dark:bg-zinc-800/50 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="relative w-full md:w-96">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                                <input
                                    type="text"
                                    placeholder={language === 'vi' ? 'Tìm kiếm nhanh...' : 'Search everything...'}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-zinc-900 border border-[rgb(var(--border))] rounded-2xl outline-none focus:ring-2 ring-sky-500/20 transition-all font-medium"
                                />
                            </div>
                            <Button variant="outline" className="rounded-xl gap-2 h-12 px-6">
                                <Filter className="h-4 w-4" /> {language === 'vi' ? 'Bộ lọc' : 'Filters'}
                            </Button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-zinc-50/50 dark:bg-zinc-800/50 text-[rgb(var(--muted-foreground))] text-xs font-black uppercase tracking-widest">
                                    <tr>
                                        {activeTab === 'users' ? (
                                            <>
                                                <th className="px-8 py-5">User</th>
                                                <th className="px-8 py-5">Role</th>
                                                <th className="px-8 py-5">Joined</th>
                                                <th className="px-8 py-5 text-right">Actions</th>
                                            </>
                                        ) : (
                                            <>
                                                <th className="px-8 py-5">Quiz Title</th>
                                                <th className="px-8 py-5">Author</th>
                                                <th className="px-8 py-5">Questions</th>
                                                <th className="px-8 py-5 text-right">Actions</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[rgb(var(--border))]">
                                    {activeTab === 'users' ? (
                                        filteredUsers.length === 0 ? (
                                            <tr><td colSpan={4} className="px-8 py-20 text-center text-zinc-400">{t.admin.noUsers}</td></tr>
                                        ) : (
                                            filteredUsers.map(u => (
                                                <tr key={u.uid} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-10 w-10 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 border-2 border-white dark:border-zinc-700 shadow-sm">
                                                                {u.photoURL ? <img src={u.photoURL} alt={u.displayName} /> : <UserCircle className="h-full w-full p-2 text-zinc-400" />}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold">{u.displayName}</div>
                                                                <div className="text-xs text-[rgb(var(--muted-foreground))]">{u.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${u.role === 'admin' ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-zinc-100 text-zinc-600 border border-zinc-200'}`}>
                                                            {u.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5 text-sm text-[rgb(var(--muted-foreground))] font-medium">
                                                        {u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : 'N/A'}
                                                    </td>
                                                    <td className="px-8 py-5 text-right space-x-2">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleRoleUpdate(u.uid, u.role)}
                                                            className={`rounded-xl px-4 ${u.role === 'admin' ? 'text-amber-600 hover:bg-amber-50' : 'text-sky-600 hover:bg-sky-50'}`}
                                                        >
                                                            {u.role === 'admin' ? t.admin.removeAdmin : t.admin.makeAdmin}
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => handleDeleteUser(u.uid)}
                                                            className="rounded-xl text-red-500 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )
                                    ) : (
                                        filteredQuizzes.length === 0 ? (
                                            <tr><td colSpan={4} className="px-8 py-20 text-center text-zinc-400">{t.admin.noQuizzes}</td></tr>
                                        ) : (
                                            filteredQuizzes.map(q => (
                                                <tr key={q.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                                    <td className="px-8 py-5">
                                                        <div className="font-bold">{q.title}</div>
                                                        <div className="text-xs text-[rgb(var(--muted-foreground))] line-clamp-1 max-w-xs">{q.description}</div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <div className="font-medium text-sm">{q.authorName || 'Anonymous'}</div>
                                                        <div className="text-[10px] text-[rgb(var(--muted-foreground))]">{q.authorEmail}</div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-bold">
                                                            {q.questions.length} questions
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5 text-right space-x-2">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => router.push(`/courses/${q.id}`)}
                                                            className="rounded-xl text-zinc-500 hover:bg-zinc-100"
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => handleDeleteQuiz(q.id!)}
                                                            className="rounded-xl text-red-500 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
