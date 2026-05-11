import { db } from "@/lib/firebase";
import { 
    collection, 
    getDocs, 
    doc, 
    deleteDoc, 
    updateDoc, 
    query, 
    orderBy, 
    where,
    getCountFromServer
} from "firebase/firestore";
import { QuizData } from "./quizService";

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string;
    role: 'user' | 'admin';
    createdAt: any;
    lastLogin: any;
}

export const getAllUsers = async (): Promise<UserProfile[]> => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as UserProfile);
};

export const getAllQuizzesAdmin = async (): Promise<QuizData[]> => {
    const q = query(collection(db, "quizzes"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizData));
};

export const updateUserRole = async (uid: string, role: 'user' | 'admin') => {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, { role });
};

export const deleteUserAdmin = async (uid: string) => {
    // Note: This only deletes the Firestore profile. 
    // Deleting from Firebase Auth requires Admin SDK.
    await deleteDoc(doc(db, "users", uid));
};

export const getSystemStats = async () => {
    const usersCount = await getCountFromServer(collection(db, "users"));
    const quizzesCount = await getCountFromServer(collection(db, "quizzes"));
    const resultsCount = await getCountFromServer(collection(db, "quiz_results"));
    
    return {
        totalUsers: usersCount.data().count,
        totalQuizzes: quizzesCount.data().count,
        totalResults: resultsCount.data().count
    };
};
