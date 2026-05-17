"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
    User,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

export interface UserData {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string;
    role: string;
    gender?: 'male' | 'female';
    snowyCoins?: number;
    ownedCostumes?: string[];
    equippedCostume?: string;
    equippedCostumeUrl?: string;
    equippedCostumeItem?: any;
    inventory?: Record<string, number>; // For power-ups
    createdAt?: any;
    lastLogin?: any;
}

interface AuthContextType {
    user: User | null;
    userData: UserData | null;
    loading: boolean;
    isAdmin: boolean;
    guestName: string | null;
    setGuestName: (name: string) => void;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
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
                        const newUserData = {
                            uid: currentUser.uid,
                            email: currentUser.email || '',
                            displayName: currentUser.displayName || '',
                            photoURL: currentUser.photoURL || '',
                            role: 'user', // Default role
                            snowyCoins: 0,
                            ownedCostumes: [],
                            createdAt: serverTimestamp(),
                            lastLogin: serverTimestamp()
                        };
                        await setDoc(userRef, newUserData);
                        setIsAdmin(false);
                        setUserData({ ...newUserData, createdAt: null, lastLogin: null } as UserData);
                    } else {
                        const uData = userSnap.data() as UserData;
                        setIsAdmin(uData.role === 'admin');
                        setUserData(uData);
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
                setUserData(null);
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

    const refreshUserData = async () => {
        if (!user) return;
        try {
            const { doc, getDoc } = await import("firebase/firestore");
            const { db } = await import("@/lib/firebase");
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                setUserData(userSnap.data() as UserData);
            }
        } catch (error) {
            console.error("Error refreshing user data:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, userData, loading, isAdmin, guestName, setGuestName, login, logout, refreshUserData }}>
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
