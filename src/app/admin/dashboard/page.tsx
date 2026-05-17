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

export default function AdminDashboardPage() {
    const { user, isAdmin, loading: authLoading } = useAuth();
    const { t, language } = useLanguage();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'quizzes'>('stats');
    const [stats, setStats] = useState<any>(null);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [quizzes, setQuizzes] = useState<QuizData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

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
            const [s, u, q] = await Promise.all([
                getSystemStats(),
                getAllUsers(),
                getAllQuizzesAdmin()
            ]);
            setStats(s);
            setUsers(u);
            setQuizzes(q);
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
