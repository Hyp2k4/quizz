"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { MessageCircle, X, Send, UserCircle, Bell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ChatMessage, subscribeToMessages, sendMessage, markRoomAsRead, ChatRoom } from "@/services/chatService";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AnimatePresence, motion } from "framer-motion";

export function SupportChatWidget() {
    const { user, isAdmin } = useAuth();
    const { language } = useLanguage();
    
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [unreadCount, setUnreadCount] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // If it's an admin, they should use the Admin Chat page instead of the widget
    // So we don't render the widget for admins. Or we can render it, but for now let's hide it.
    
    useEffect(() => {
        if (!user || isAdmin) return;

        // Listen for unread count
        const roomRef = doc(db, "chats", user.uid);
        const unsubRoom = onSnapshot(roomRef, (doc) => {
            if (doc.exists()) {
                const roomData = doc.data() as ChatRoom;
                setUnreadCount(roomData.unreadUser || 0);
            }
        });

        // Listen for messages
        const unsubMsgs = subscribeToMessages(user.uid, (msgs) => {
            setMessages(msgs);
        });

        return () => {
            unsubRoom();
            unsubMsgs();
        };
    }, [user, isAdmin]);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            if (user && unreadCount > 0) {
                markRoomAsRead(user.uid, false);
            }
        }
    }, [messages, isOpen, user, unreadCount]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;

        try {
            await sendMessage(
                user.uid,
                user.displayName || "User",
                user.email || "",
                newMessage,
                user.uid,
                false // not admin
            );
            setNewMessage("");
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };

    if (!user || isAdmin) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white dark:bg-zinc-900 shadow-2xl rounded-3xl w-[350px] max-w-[calc(100vw-32px)] h-[500px] max-h-[calc(100vh-100px)] flex flex-col mb-4 overflow-hidden border border-zinc-200 dark:border-zinc-800"
                    >
                        {/* Header */}
                        <div className="bg-sky-500 text-white p-4 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg">{language === 'vi' ? 'Hỗ trợ & Thông báo' : 'Support & Announcements'}</h3>
                                <p className="text-xs text-sky-100">{language === 'vi' ? 'Trực tiếp với Quản trị viên' : 'Directly with Admin'}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white hover:bg-white/20 h-8 w-8 rounded-full p-0">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50 dark:bg-zinc-950">
                            {messages.length === 0 ? (
                                <div className="text-center text-zinc-400 text-sm mt-10 space-y-2">
                                    <MessageCircle className="h-10 w-10 mx-auto opacity-20" />
                                    <p>{language === 'vi' ? 'Bạn có cần hỗ trợ gì không?' : 'Do you need any help?'}</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isMine = msg.senderId === user.uid;
                                    return (
                                        <div key={msg.id || idx} className={`flex gap-2 max-w-[85%] ${isMine ? 'ml-auto flex-row-reverse' : ''}`}>
                                            {!isMine && (
                                                <div className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800 mt-auto mb-4">
                                                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">A</span>
                                                </div>
                                            )}
                                            <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                                                <div className={`rounded-2xl px-3 py-2 text-sm ${isMine ? 'bg-sky-500 text-white rounded-br-sm' : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-sm border border-zinc-100 dark:border-zinc-700 shadow-sm'}`}>
                                                    {msg.text}
                                                </div>
                                                <div className="text-[9px] text-zinc-400 mt-0.5 px-1">
                                                    {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Form */}
                        <div className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
                            <form onSubmit={handleSend} className="flex gap-2">
                                <Input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={language === 'vi' ? 'Nhập tin nhắn...' : 'Type a message...'}
                                    className="flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border-none focus-visible:ring-1 focus-visible:ring-sky-500"
                                />
                                <Button type="submit" disabled={!newMessage.trim()} className="rounded-full h-10 w-10 p-0 bg-sky-500 hover:bg-sky-600 text-white shrink-0">
                                    <Send className="h-4 w-4 ml-1" />
                                </Button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="h-14 w-14 rounded-full bg-sky-500 text-white shadow-xl flex items-center justify-center relative"
            >
                {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
                
                {!isOpen && unreadCount > 0 && (
                    <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[10px] font-bold"
                    >
                        {unreadCount}
                    </motion.div>
                )}
            </motion.button>
        </div>
    );
}
