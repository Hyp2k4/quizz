import { db } from "@/lib/firebase";
import { collection, doc, addDoc, onSnapshot, query, orderBy, serverTimestamp, setDoc, getDocs, updateDoc, increment } from "firebase/firestore";

export interface ChatMessage {
    id?: string;
    text: string;
    senderId: string;
    senderName: string;
    createdAt: any;
    isRead: boolean;
    isAdmin: boolean;
}

export interface ChatRoom {
    id: string; // matches userId
    userName: string;
    userEmail: string;
    userPhotoURL?: string;
    lastMessage: string;
    lastMessageTime: any;
    unreadAdmin: number;
    unreadUser: number;
}

// Send a message
export const sendMessage = async (userId: string, userName: string, userEmail: string, text: string, senderId: string, isAdmin: boolean) => {
    const roomRef = doc(db, "chats", userId);
    const messagesRef = collection(roomRef, "messages");

    // Add message
    await addDoc(messagesRef, {
        text,
        senderId,
        senderName: userName,
        createdAt: serverTimestamp(),
        isRead: false,
        isAdmin
    });

    // Update room metadata
    await setDoc(roomRef, {
        id: userId,
        userName,
        userEmail,
        lastMessage: text,
        lastMessageTime: serverTimestamp(),
        unreadAdmin: isAdmin ? 0 : increment(1),
        unreadUser: isAdmin ? increment(1) : 0,
    }, { merge: true });
};

// Subscribe to messages in a specific user's chat
export const subscribeToMessages = (userId: string, callback: (messages: ChatMessage[]) => void) => {
    const q = query(collection(db, "chats", userId, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
        callback(msgs);
    });
};

// Subscribe to all chat rooms (for Admin)
export const subscribeToChatRooms = (callback: (rooms: ChatRoom[]) => void) => {
    const q = query(collection(db, "chats"), orderBy("lastMessageTime", "desc"));
    return onSnapshot(q, (snapshot) => {
        const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatRoom));
        callback(rooms);
    });
};

// Mark room messages as read
export const markRoomAsRead = async (userId: string, isAdminReading: boolean) => {
    const roomRef = doc(db, "chats", userId);
    if (isAdminReading) {
        await setDoc(roomRef, { unreadAdmin: 0 }, { merge: true });
    } else {
        await setDoc(roomRef, { unreadUser: 0 }, { merge: true });
    }
};
