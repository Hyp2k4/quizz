"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MessageCircle, Send, UserCircle, ArrowLeft, Check, CheckCheck, Users, MessageSquare } from "lucide-react";
import { ChatRoom, ChatMessage, subscribeToChatRooms, subscribeToMessages, sendMessage, markRoomAsRead } from "@/services/chatService";
import { getAllUsers, UserProfile } from "@/services/adminService";

export default function AdminChatPage() {
    const { user, isAdmin, loading: authLoading } = useAuth();
    const { language } = useLanguage();
    const router = useRouter();

    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [sidebarTab, setSidebarTab] = useState<'chats' | 'users'>('chats');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!authLoading && (!user || !isAdmin)) {
            router.push("/admin/login");
            return;
        }

        if (isAdmin) {
            const unsub = subscribeToChatRooms(setRooms);
            getAllUsers().then(setAllUsers);
            return () => unsub();
        }
    }, [user, isAdmin, authLoading, router]);

    useEffect(() => {
        if (selectedRoomId) {
            markRoomAsRead(selectedRoomId, true);
            const unsub = subscribeToMessages(selectedRoomId, setMessages);
            return () => unsub();
        } else {
            setMessages([]);
        }
    }, [selectedRoomId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedRoomId || !user) return;

        const currentRoom = rooms.find(r => r.id === selectedRoomId);
        if (!currentRoom) return;

        try {
            await sendMessage(
                selectedRoomId,
                currentRoom.userName,
                currentRoom.userEmail,
                newMessage,
                user.uid,
                true // isAdmin
            );
            setNewMessage("");
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };

    if (authLoading || !isAdmin) return <div className="min-h-screen pt-32 text-center">Loading...</div>;

    const selectedRoom = rooms.find(r => r.id === selectedRoomId);

    return (
        <div className="min-h-screen bg-[rgb(var(--background))] flex flex-col">
            <Navbar />
            
            <main className="flex-1 pt-24 px-4 pb-8 max-w-7xl mx-auto w-full flex flex-col">
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" size="sm" onClick={() => router.push('/admin/dashboard')} className="h-10 w-10 p-0 rounded-full bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-white/5">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-black">{language === 'vi' ? 'Quản lý Chat' : 'Chat Management'}</h1>
                        <p className="text-sm text-zinc-500">{language === 'vi' ? 'Hỗ trợ và thông báo cho tác giả' : 'Support and announcements for authors'}</p>
                    </div>
                </div>

                <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-[500px] h-[calc(100vh-200px)]">
                    {/* Sidebar */}
                    <Card className={`w-full md:w-80 flex-shrink-0 flex flex-col rounded-3xl overflow-hidden border-none shadow-xl ${selectedRoomId ? 'hidden md:flex' : 'flex'}`}>
                        <div className="flex border-b bg-zinc-50 dark:bg-zinc-900/50">
                            <button 
                                onClick={() => setSidebarTab('chats')} 
                                className={`flex-1 p-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${sidebarTab === 'chats' ? 'text-sky-600 border-b-2 border-sky-500 bg-white dark:bg-zinc-800' : 'text-zinc-500 hover:bg-white/50 dark:hover:bg-zinc-800/50'}`}
                            >
                                <MessageSquare className="h-4 w-4" /> {language === 'vi' ? 'Hội thoại' : 'Chats'}
                            </button>
                            <button 
                                onClick={() => setSidebarTab('users')} 
                                className={`flex-1 p-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${sidebarTab === 'users' ? 'text-sky-600 border-b-2 border-sky-500 bg-white dark:bg-zinc-800' : 'text-zinc-500 hover:bg-white/50 dark:hover:bg-zinc-800/50'}`}
                            >
                                <Users className="h-4 w-4" /> {language === 'vi' ? 'Tất cả User' : 'Users'}
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {sidebarTab === 'chats' ? (
                                rooms.length === 0 ? (
                                    <div className="text-center p-8 text-zinc-400 text-sm">
                                        {language === 'vi' ? 'Chưa có tin nhắn nào' : 'No messages yet'}
                                    </div>
                                ) : (
                                    rooms.map(room => (
                                        <button
                                            key={room.id}
                                            onClick={() => setSelectedRoomId(room.id)}
                                            className={`w-full text-left p-3 rounded-2xl flex items-center gap-3 transition-all ${selectedRoomId === room.id ? 'bg-sky-50 dark:bg-sky-900/20' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                                        >
                                            <div className="relative">
                                                <div className="h-12 w-12 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden shrink-0 border-2 border-white dark:border-zinc-900">
                                                    {room.userPhotoURL ? <img src={room.userPhotoURL} alt={room.userName} className="h-full w-full object-cover" /> : <UserCircle className="h-8 w-8 text-zinc-400" />}
                                                </div>
                                                {room.unreadAdmin > 0 && (
                                                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900">
                                                        {room.unreadAdmin}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-sm truncate text-zinc-900 dark:text-zinc-100">{room.userName}</div>
                                                <div className={`text-xs truncate ${room.unreadAdmin > 0 ? 'text-zinc-900 dark:text-white font-bold' : 'text-zinc-500'}`}>
                                                    {room.lastMessage}
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )
                            ) : (
                                allUsers.length === 0 ? (
                                    <div className="text-center p-8 text-zinc-400 text-sm">Loading...</div>
                                ) : (
                                    allUsers.map(u => (
                                        <button
                                            key={u.uid}
                                            onClick={async () => {
                                                setSelectedRoomId(u.uid);
                                                setSidebarTab('chats');
                                                if (!rooms.find(r => r.id === u.uid)) {
                                                    const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
                                                    const { db } = await import("@/lib/firebase");
                                                    await setDoc(doc(db, "chats", u.uid), {
                                                        id: u.uid,
                                                        userName: u.displayName,
                                                        userEmail: u.email,
                                                        userPhotoURL: u.photoURL || null,
                                                        lastMessage: "Bắt đầu hội thoại mới",
                                                        lastMessageTime: serverTimestamp(),
                                                        unreadAdmin: 0,
                                                        unreadUser: 0
                                                    }, { merge: true });
                                                }
                                            }}
                                            className={`w-full text-left p-3 rounded-2xl flex items-center gap-3 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/50`}
                                        >
                                            <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden shrink-0 border-2 border-white dark:border-zinc-900">
                                                {u.photoURL ? <img src={u.photoURL} alt={u.displayName} className="h-full w-full object-cover" /> : <UserCircle className="h-6 w-6 text-zinc-400" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-sm truncate text-zinc-900 dark:text-zinc-100">{u.displayName}</div>
                                                <div className="text-[10px] text-zinc-400 truncate">{u.email}</div>
                                            </div>
                                        </button>
                                    ))
                                )
                            )}
                        </div>
                    </Card>

                    {/* Chat Area */}
                    <Card className={`flex-1 flex flex-col rounded-3xl overflow-hidden border-none shadow-xl ${!selectedRoomId ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
                        {!selectedRoomId ? (
                            <div className="text-center space-y-4 text-zinc-400">
                                <MessageCircle className="h-16 w-16 mx-auto opacity-20" />
                                <p>{language === 'vi' ? 'Chọn một cuộc hội thoại để bắt đầu' : 'Select a conversation to start'}</p>
                            </div>
                        ) : (
                            <>
                                {/* Chat Header */}
                                <div className="p-4 border-b bg-zinc-50 dark:bg-zinc-900/50 flex items-center gap-3">
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedRoomId(null)} className="md:hidden h-8 w-8 p-0">
                                        <ArrowLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                                        <UserCircle className="h-6 w-6 text-zinc-400" />
                                    </div>
                                    <div>
                                        <div className="font-bold">{selectedRoom?.userName}</div>
                                        <div className="text-xs text-zinc-500">{selectedRoom?.userEmail}</div>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {messages.map((msg, idx) => {
                                        const isMine = msg.isAdmin;
                                        return (
                                            <div key={msg.id || idx} className={`flex gap-3 max-w-[80%] ${isMine ? 'ml-auto flex-row-reverse' : ''}`}>
                                                {!isMine && (
                                                    <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden shrink-0 mt-auto mb-5">
                                                        {selectedRoom?.userPhotoURL ? <img src={selectedRoom.userPhotoURL} alt={msg.senderName} className="h-full w-full object-cover" /> : <UserCircle className="h-5 w-5 text-zinc-400" />}
                                                    </div>
                                                )}
                                                <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                                                    <div className={`rounded-2xl px-4 py-2 ${isMine ? 'bg-sky-500 text-white rounded-br-sm' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-sm'}`}>
                                                        {msg.text}
                                                    </div>
                                                    <div className="text-[10px] text-zinc-400 mt-1 px-1">
                                                        {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input */}
                                <div className="p-4 bg-white dark:bg-zinc-900 border-t">
                                    <form onSubmit={handleSend} className="flex gap-2">
                                        <Input
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder={language === 'vi' ? 'Nhập tin nhắn...' : 'Type a message...'}
                                            className="flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border-none focus-visible:ring-1 focus-visible:ring-sky-500 h-12 px-6"
                                        />
                                        <Button type="submit" disabled={!newMessage.trim()} className="h-12 w-12 rounded-full p-0 bg-sky-500 hover:bg-sky-600 text-white shrink-0">
                                            <Send className="h-5 w-5 ml-1" />
                                        </Button>
                                    </form>
                                </div>
                            </>
                        )}
                    </Card>
                </div>
            </main>
        </div>
    );
}
