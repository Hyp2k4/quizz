"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
    User,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
    guestName: string | null;
    setGuestName: (name: string) => void;
    login: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [guestName, setGuestNameState] = useState<string | null>(null);

    useEffect(() => {
        // Check local storage for guest name
        const storedGuest = localStorage.getItem("guestName");
        if (storedGuest) setGuestNameState(storedGuest);

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            
            if (currentUser) {
                // Sync user to Firestore
                try {
                    const { doc, getDoc, setDoc, serverTimestamp } = await import("firebase/firestore");
                    const { db } = await import("@/lib/firebase");
                    const userRef = doc(db, "users", currentUser.uid);
                    const userSnap = await getDoc(userRef);
                    
                    if (!userSnap.exists()) {
                        await setDoc(userRef, {
                            uid: currentUser.uid,
                            email: currentUser.email,
                            displayName: currentUser.displayName,
                            photoURL: currentUser.photoURL,
                            role: 'user', // Default role
                            createdAt: serverTimestamp(),
                            lastLogin: serverTimestamp()
                        });
                        setIsAdmin(false);
                    } else {
                        const userData = userSnap.data();
                        setIsAdmin(userData.role === 'admin');
                        await setDoc(userRef, {
                            lastLogin: serverTimestamp(),
                            displayName: currentUser.displayName,
                            photoURL: currentUser.photoURL,
                        }, { merge: true });
                    }
                } catch (error) {
                    console.error("Error syncing user:", error);
                }
            } else {
                setIsAdmin(false);
            }
            
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const setGuestName = (name: string) => {
        setGuestNameState(name);
        localStorage.setItem("guestName", name);
    };

    const login = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Login failed", error);
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            setIsAdmin(false);
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, isAdmin, guestName, setGuestName, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
