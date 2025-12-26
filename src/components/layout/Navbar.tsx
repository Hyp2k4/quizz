"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Zap, LogIn, LogOut, User as UserIcon, Menu, X, PlusCircle, LayoutDashboard, Settings, BookOpen } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationInbox } from "@/components/quiz/NotificationInbox";

export function Navbar() {
    const { t, language, setLanguage } = useLanguage();
    const { user, login, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Close menu when route changes
    useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);

    const handleCreateClick = () => {
        if (!user) {
            toast.error(t.navbar.loginRequired, {
                action: {
                    label: t.navbar.login,
                    onClick: () => login()
                },
                duration: 4000
            });
        } else {
            router.push("/questionbuilder");
        }
    };

    const navLinks = [
        { name: t.navbar.allCourses, href: "/courses", icon: LayoutDashboard },
        { name: t.navbar.features, href: "/", icon: Zap },
        { name: t.navbar.community, href: "/", icon: UserIcon },
    ];

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 z-[60] px-3 md:px-6 py-4">
                <div className="glass mx-auto flex h-16 max-w-7xl items-center justify-between rounded-2xl px-4 md:px-6 shadow-sm border border-white/20">
                    <Link href="/" className="flex items-center gap-2 md:gap-3 shrink-0">
                        <img
                            src="/logo.png"
                            alt="Lustio Quiz Logo"
                            className="h-8 w-8 md:h-10 md:w-10 object-contain hover:scale-110 transition-transform duration-300"
                        />
                        <span className="text-xl md:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 animate-gradient-x hidden sm:block">
                            Lustio Quiz
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[rgb(var(--muted-foreground))]">
                        {navLinks.map((link) => (
                            <Link key={link.name} href={link.href} className="hover:text-[rgb(var(--foreground))] transition-colors">
                                {link.name}
                            </Link>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        {/* Desktop Actions */}
                        <div className="hidden md:flex items-center gap-4">
                            <div className="flex items-center bg-[rgb(var(--secondary))] rounded-full p-1">
                                <button
                                    onClick={() => setLanguage('vi')}
                                    className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${language === 'vi' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    VN
                                </button>
                                <button
                                    onClick={() => setLanguage('en')}
                                    className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${language === 'en' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    EN
                                </button>
                            </div>

                            {user && (
                                <Link href="/my-courses">
                                    <Button variant="ghost" size="sm" className="rounded-full">
                                        {t.navbar.myCourses}
                                    </Button>
                                </Link>
                            )}

                            <Button size="sm" onClick={handleCreateClick} className="rounded-full px-6">
                                {t.navbar.createQuiz}
                            </Button>

                            {user && <NotificationInbox />}
                        </div>

                        {/* User Auth Desktop & Mobile Trigger */}
                        <div className="flex items-center gap-2">
                            {user ? (
                                <div className="hidden md:flex items-center gap-2 pl-2 border-l border-[rgb(var(--border))]">
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt="User" className="h-8 w-8 rounded-full border border-[rgb(var(--border))]" />
                                    ) : (
                                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                            <UserIcon className="h-4 w-4 text-indigo-600" />
                                        </div>
                                    )}
                                    <Button variant="ghost" size="icon" onClick={logout} title={t.navbar.logout}>
                                        <LogOut className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <Button variant="ghost" size="sm" onClick={() => login()} className="hidden md:flex gap-2">
                                    <LogIn className="h-4 w-4" />
                                    {t.navbar.login}
                                </Button>
                            )}

                            {/* Mobile Toggle */}
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="flex md:hidden h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg active:scale-95 transition-transform"
                            >
                                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                            </button>

                            {/* Notification for mobile only when logged in */}
                            {user && (
                                <div className="md:hidden">
                                    <NotificationInbox />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Sidebar/Drawer Overlay */}
            <AnimatePresence>
                {isMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMenuOpen(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] md:hidden"
                        />
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 bottom-0 w-[280px] bg-white dark:bg-zinc-900 z-[80] md:hidden shadow-2xl flex flex-col"
                        >
                            <div className="p-6 flex items-center justify-between border-b dark:border-zinc-800">
                                <span className="font-bold text-lg">Menu</span>
                                <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                {/* Navigation Links */}
                                <div className="space-y-1">
                                    {navLinks.map((link) => (
                                        <Link key={link.name} href={link.href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors font-medium">
                                            <link.icon className="h-5 w-5 text-indigo-500" />
                                            {link.name}
                                        </Link>
                                    ))}
                                    {user && (
                                        <Link href="/my-courses" className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors font-medium text-indigo-600">
                                            <BookOpen className="h-5 w-5" />
                                            {t.navbar.myCourses}
                                        </Link>
                                    )}
                                </div>

                                <div className="h-[1px] bg-zinc-100 dark:bg-zinc-800" />

                                {/* User Section */}
                                <div className="space-y-4">
                                    {user ? (
                                        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border dark:border-zinc-800">
                                            <div className="flex items-center gap-3 mb-4">
                                                {user.photoURL ? (
                                                    <img src={user.photoURL} alt="User" className="h-10 w-10 rounded-full" />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                                        <UserIcon className="h-5 w-5 text-indigo-600" />
                                                    </div>
                                                )}
                                                <div className="flex-1 overflow-hidden">
                                                    <p className="font-bold truncate">{user.displayName || "Học viên"}</p>
                                                    <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                                                </div>
                                            </div>
                                            <Button variant="destructive" className="w-full gap-2 rounded-xl" onClick={logout}>
                                                <LogOut className="h-4 w-4" /> {t.navbar.logout}
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button className="w-full gap-2 rounded-xl h-12" onClick={() => login()}>
                                            <LogIn className="h-5 w-5" /> {t.navbar.login}
                                        </Button>
                                    )}

                                    <Button className="w-full gap-2 rounded-xl h-12 bg-indigo-600" onClick={handleCreateClick}>
                                        <PlusCircle className="h-5 w-5" /> {t.navbar.createQuiz}
                                    </Button>

                                    {/* Language Switcher Mobile */}
                                    <div className="flex justify-center gap-2 pt-2">
                                        <button onClick={() => setLanguage('vi')} className={`flex-1 py-2 px-4 rounded-xl border text-sm font-bold ${language === 'vi' ? 'bg-zinc-900 text-white dark:bg-white dark:text-black border-zinc-900' : 'bg-transparent text-zinc-500 border-zinc-200 dark:border-zinc-800'}`}>VN</button>
                                        <button onClick={() => setLanguage('en')} className={`flex-1 py-2 px-4 rounded-xl border text-sm font-bold ${language === 'en' ? 'bg-zinc-900 text-white dark:bg-white dark:text-black border-zinc-900' : 'bg-transparent text-zinc-500 border-zinc-200 dark:border-zinc-800'}`}>EN</button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 text-center text-[10px] text-zinc-400 font-medium tracking-widest uppercase">
                                Lustio Quiz v1.2.0
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
