"use client";

import { useState, useEffect } from "react";
import { getNotifications, markNotificationAsRead, Notification } from "@/services/quizService";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, CheckCircle2, MessageSquare, AlertTriangle, ExternalLink, Inbox, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export function NotificationInbox() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const unreadCount = notifications.filter(n => !n.read).length;

    useEffect(() => {
        if (user) {
            loadNotifications();
        }
    }, [user]);

    const loadNotifications = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await getNotifications(user.uid);
            setNotifications(data);
        } catch (error) {
            console.error("Error loading notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            await markNotificationAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (error) {
            console.error("Error marking as read:", error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'quiz_complete': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'comment': return <MessageSquare className="h-4 w-4 text-blue-500" />;
            case 'missing_answer': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
            default: return <Bell className="h-4 w-4 text-indigo-500" />;
        }
    };

    const formatDate = (date: any) => {
        if (!date) return "";
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString("vi-VN", { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="relative">
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsOpen(!isOpen)} 
                className={`rounded-full relative ${isOpen ? 'bg-indigo-50 dark:bg-indigo-950/20' : ''}`}
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-zinc-900 animate-pulse">
                        {unreadCount}
                    </span>
                )}
            </Button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 z-[100]"
                        />
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 mt-3 w-80 md:w-96 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl z-[101] overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-4 border-b dark:border-zinc-800 bg-indigo-50/50 dark:bg-indigo-950/10 flex justify-between items-center">
                                <h3 className="font-bold flex items-center gap-2">
                                    <Inbox className="h-4 w-4" /> Bản tin Lustio
                                </h3>
                                <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* List */}
                            <div className="max-h-[70vh] overflow-y-auto">
                                {loading && notifications.length === 0 ? (
                                    <div className="p-8 text-center text-zinc-400 text-sm">Đang tải bản tin...</div>
                                ) : notifications.length === 0 ? (
                                    <div className="p-8 text-center text-zinc-400">
                                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                        <p className="text-sm">Bạn chưa có thông báo nào mới.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y dark:divide-zinc-800">
                                        {notifications.map((notif) => (
                                            <div 
                                                key={notif.id} 
                                                onMouseEnter={() => !notif.read && handleMarkAsRead(notif.id!)}
                                                className={`p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 relative group ${!notif.read ? 'bg-indigo-50/20 dark:bg-indigo-900/5' : ''}`}
                                            >
                                                {!notif.read && (
                                                    <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-indigo-500" />
                                                )}
                                                <div className="flex gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-white dark:bg-zinc-800 border dark:border-zinc-700 flex items-center justify-center shrink-0 shadow-sm">
                                                        {getIcon(notif.type)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm font-bold truncate ${!notif.read ? 'text-indigo-600' : ''}`}>{notif.title}</p>
                                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">{notif.message}</p>
                                                        <div className="flex items-center justify-between mt-3">
                                                            <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {formatDate(notif.createdAt)}
                                                            </span>
                                                            <Link href={notif.link} onClick={() => setIsOpen(false)}>
                                                                <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    Xem chi tiết <ExternalLink className="h-3 w-3" />
                                                                </Button>
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            {notifications.length > 0 && (
                                <div className="p-3 border-t dark:border-zinc-800 text-center">
                                    <button 
                                        onClick={loadNotifications}
                                        className="text-[10px] font-bold text-zinc-400 hover:text-indigo-500 uppercase tracking-widest"
                                    >
                                        Làm mới thông báo
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
