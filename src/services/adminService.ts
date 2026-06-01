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
import { OpenGradingConfig, DEFAULT_OPEN_GRADING_CONFIG } from "@/utils/openGrading";

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

const OPEN_GRADING_DOC_PATH = { col: "system_config", doc: "open_grading" } as const;

export const getOpenGradingConfigAdmin = async (): Promise<OpenGradingConfig> => {
    const ref = doc(db, OPEN_GRADING_DOC_PATH.col, OPEN_GRADING_DOC_PATH.doc);
    const snap = await (await import("firebase/firestore")).getDoc(ref);
    if (!snap.exists()) return DEFAULT_OPEN_GRADING_CONFIG;
    const data = snap.data() as Partial<OpenGradingConfig>;
    return { ...DEFAULT_OPEN_GRADING_CONFIG, ...data };
};

export const updateOpenGradingConfigAdmin = async (config: Partial<OpenGradingConfig>) => {
    const ref = doc(db, OPEN_GRADING_DOC_PATH.col, OPEN_GRADING_DOC_PATH.doc);
    const { setDoc, serverTimestamp } = await import("firebase/firestore");
    await setDoc(ref, { ...config, updatedAt: serverTimestamp() } as any, { merge: true });
};

export const ensureOpenGradingConfigAdmin = async () => {
    const ref = doc(db, OPEN_GRADING_DOC_PATH.col, OPEN_GRADING_DOC_PATH.doc);
    const { getDoc, setDoc, serverTimestamp } = await import("firebase/firestore");
    const snap = await getDoc(ref);
    if (snap.exists()) return;
    await setDoc(ref, {
        ...DEFAULT_OPEN_GRADING_CONFIG,
        updatedAt: serverTimestamp()
    } as any);
};
