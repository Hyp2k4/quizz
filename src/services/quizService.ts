import { db } from "@/lib/firebase";
import { 
    collection, 
    addDoc, 
    serverTimestamp, 
    getDocs, 
    getDoc, 
    doc, 
    query, 
    where, 
    deleteDoc,
    updateDoc,
    orderBy,
    limit
} from "firebase/firestore";
import { Question } from "@/components/quiz/QuestionCard";

export interface QuizResult {
  id?: string;
  quizId: string;
  userId?: string;
  userName: string;
  score: number;
  totalQuestions: number;
  timeTakenMs: number;
  createdAt: any;
}

export interface QuizData {
  id?: string;
  title: string;
  description: string;
  questions: Question[];
  userId?: string;
  authorName?: string;
  createdAt?: any;
}

export interface Comment {
  id?: string;
  quizId: string;
  userId: string;
  userName: string;
  text: string;
  replies?: Reply[];
  createdAt: any;
}

export interface Reply {
  id?: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: any;
}

export interface Notification {
  id?: string;
  userId: string; // The person receiving the notification (course owner)
  type: 'quiz_complete' | 'comment' | 'missing_answer';
  title: string;
  message: string;
  link: string;
  read: boolean;
  createdAt: any;
}

export const saveQuizResult = async (result: Omit<QuizResult, "id" | "createdAt">) => {
    try {
        await addDoc(collection(db, "quiz_results"), {
            ...result,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error saving result:", error);
        throw error;
    }
};

export const getQuizLeaderboard = async (quizId: string): Promise<QuizResult[]> => {
    try {
        const q = query(
            collection(db, "quiz_results"), 
            where("quizId", "==", quizId),
            orderBy("score", "desc"),
            orderBy("timeTakenMs", "asc"),
            limit(10)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as QuizResult));
    } catch (error) {
        console.error("Error fetching leaderboard. Make sure indexes are created.", error);
        return [];
    }
};

export const getUserQuizzes = async (userId: string): Promise<QuizData[]> => {
    const q = query(collection(db, "quizzes"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as QuizData));
};

export const deleteQuiz = async (id: string) => {
    await deleteDoc(doc(db, "quizzes", id));
};

export const updateQuiz = async (id: string, quiz: Partial<QuizData>) => {
    const { id: _, createdAt, ...data } = quiz;
    await updateDoc(doc(db, "quizzes", id), {
        ...data,
        updatedAt: serverTimestamp()
    });
};

export const saveQuizToFirestore = async (quiz: QuizData) => {
  try {
    const { id, ...data } = quiz; 
    const docRef = await addDoc(collection(db, "quizzes"), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
};

export const getQuizzes = async (): Promise<QuizData[]> => {
    const querySnapshot = await getDocs(collection(db, "quizzes"));
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as QuizData));
};

export const getQuizById = async (id: string): Promise<QuizData | null> => {
    const docRef = doc(db, "quizzes", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as QuizData;
    } else {
        return null;
    }
};

export const getQuizComments = async (quizId: string): Promise<Comment[]> => {
    const q = query(
        collection(db, "quiz_comments"),
        where("quizId", "==", quizId),
        orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Comment));
};

export const addQuizComment = async (quizId: string, text: string, userId: string, userName: string) => {
    const docRef = await addDoc(collection(db, "quiz_comments"), {
        quizId,
        text,
        userId,
        userName,
        replies: [],
        createdAt: serverTimestamp()
    });
    return docRef.id;
};

export const addCommentReply = async (commentId: string, text: string, userId: string, userName: string) => {
    const commentRef = doc(db, "quiz_comments", commentId);
    const commentSnap = await getDoc(commentRef);
    if (!commentSnap.exists()) return;

    const data = commentSnap.data();
    const replies = data.replies || [];
    const newReply = {
        id: Math.random().toString(36).substr(2, 9),
        userId,
        userName,
        text,
        createdAt: new Date() // Firebase doesn't support nested serverTimestamp in array easily
    };

    await updateDoc(commentRef, {
        replies: [...replies, newReply]
    });
};

export const getNotifications = async (userId: string): Promise<Notification[]> => {
    const q = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(20)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
};

export const createNotification = async (notif: Omit<Notification, "id" | "createdAt" | "read">) => {
    await addDoc(collection(db, "notifications"), {
        ...notif,
        read: false,
        createdAt: serverTimestamp()
    });
};

export const markNotificationAsRead = async (id: string) => {
    const docRef = doc(db, "notifications", id);
    await updateDoc(docRef, { read: true });
};
