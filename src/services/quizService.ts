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
    limit,
    onSnapshot,
    setDoc
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
  authorEmail?: string;
  collaborators?: string[]; // Array of user emails
  createdAt?: any;
  visibility?: 'public' | 'private';
  accessCode?: string; // Optional code for private access
}

export interface Comment {
  id?: string;
  quizId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  text: string;
  replies?: Reply[];
  createdAt: any;
}

export interface Reply {
  id?: string;
  userId: string;
  userName: string;
  userEmail?: string;
  text: string;
  createdAt: any;
}

export interface UserPresence {
  userId: string;
  userName: string;
  editingQuestionId: string | null;
  lastActive: any;
}

export interface Notification {
  id?: string;
  userId: string; // The person receiving the notification (course owner)
  type: 'quiz_complete' | 'comment' | 'missing_answer' | 'invitation';
  title: string;
  message: string;
  link: string;
  read: boolean;
  createdAt: any;
}

export interface QuizInvitation {
    id?: string;
    quizId: string;
    quizTitle: string;
    inviterName: string;
    inviteeEmail: string;
    status: 'pending' | 'accepted';
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

export const getUserQuizzes = async (userId: string, userEmail?: string | null): Promise<QuizData[]> => {
    // Quizzes owned by user
    const qOwner = query(collection(db, "quizzes"), where("userId", "==", userId));
    const ownerSnapshot = await getDocs(qOwner);
    const ownedQuizzes = ownerSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as QuizData));

    // Quizzes where user is a collaborator
    let collaboratedQuizzes: QuizData[] = [];
    if (userEmail) {
        const qCollab = query(collection(db, "quizzes"), where("collaborators", "array-contains", userEmail));
        const collabSnapshot = await getDocs(qCollab);
        collaboratedQuizzes = collabSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as QuizData));
    }

    // Combine and remove duplicates (though theoretically there shouldn't be any if logic is correct)
    const allQuizzes = [...ownedQuizzes];
    collaboratedQuizzes.forEach(cq => {
        if (!allQuizzes.find(q => q.id === cq.id)) {
            allQuizzes.push(cq);
        }
    });

    return allQuizzes;
};

export const addCollaborator = async (quizId: string, email: string) => {
    const quizRef = doc(db, "quizzes", quizId);
    const quizSnap = await getDoc(quizRef);
    if (!quizSnap.exists()) throw new Error("Quiz not found");

    const data = quizSnap.data();
    const collaborators = data.collaborators || [];
    if (collaborators.includes(email)) return;

    await updateDoc(quizRef, {
        collaborators: [...collaborators, email]
    });
};

export const removeCollaborator = async (quizId: string, email: string) => {
    const quizRef = doc(db, "quizzes", quizId);
    const quizSnap = await getDoc(quizRef);
    if (!quizSnap.exists()) throw new Error("Quiz not found");

    const data = quizSnap.data();
    const collaborators = data.collaborators || [];
    
    await updateDoc(quizRef, {
        collaborators: collaborators.filter((e: string) => e !== email)
    });
};

export const updateQuizVisibility = async (quizId: string, visibility: 'public' | 'private', accessCode?: string) => {
    const quizRef = doc(db, "quizzes", quizId);
    await updateDoc(quizRef, {
        visibility,
        accessCode: visibility === 'private' ? (accessCode || null) : null
    });
};

export const verifyQuizAccessCode = async (quizId: string, code: string): Promise<boolean> => {
    const quizRef = doc(db, "quizzes", quizId);
    const quizSnap = await getDoc(quizRef);
    if (!quizSnap.exists()) return false;
    const data = quizSnap.data();
    return data.accessCode === code;
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
      visibility: data.visibility || 'public',
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
};

export const getQuizzes = async (): Promise<QuizData[]> => {
    // Only return public quizzes (where visibility is not 'private')
    const q = query(collection(db, "quizzes"), where("visibility", "!=", "private"));
    const querySnapshot = await getDocs(q);
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

export const getQuizByAccessCode = async (code: string): Promise<QuizData | null> => {
    const q = query(collection(db, "quizzes"), where("accessCode", "==", code.trim().toUpperCase()));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as QuizData;
    }
    return null;
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

export const addQuizComment = async (quizId: string, text: string, userId: string, userName: string, userEmail?: string) => {
    const docRef = await addDoc(collection(db, "quiz_comments"), {
        quizId,
        text,
        userId,
        userName,
        userEmail,
        replies: [],
        createdAt: serverTimestamp()
    });
    return docRef.id;
};

export const addCommentReply = async (commentId: string, text: string, userId: string, userName: string, userEmail?: string) => {
    const commentRef = doc(db, "quiz_comments", commentId);
    const commentSnap = await getDoc(commentRef);
    if (!commentSnap.exists()) return;

    const data = commentSnap.data();
    const replies = data.replies || [];
    const newReply = {
        id: Math.random().toString(36).substr(2, 9),
        userId,
        userName,
        userEmail,
        text,
        createdAt: new Date()
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

export const createQuizInvitation = async (quizId: string, quizTitle: string, inviterName: string, inviteeEmail: string) => {
    const docRef = await addDoc(collection(db, "quiz_invitations"), {
        quizId,
        quizTitle,
        inviterName,
        inviteeEmail: inviteeEmail.toLowerCase(),
        status: 'pending',
        createdAt: serverTimestamp()
    });
    return docRef.id;
};

export const getInvitation = async (id: string): Promise<QuizInvitation | null> => {
    const docSnap = await getDoc(doc(db, "quiz_invitations", id));
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as QuizInvitation;
    }
    return null;
};

export const acceptQuizInvitation = async (invitationId: string, userEmail: string) => {
    const invRef = doc(db, "quiz_invitations", invitationId);
    const invSnap = await getDoc(invRef);
    if (!invSnap.exists()) throw new Error("Invitation not found");

    const invitation = invSnap.data() as QuizInvitation;
    if (invitation.status === 'accepted') throw new Error("Invitation already accepted");
    
    // Add user as collaborator
    await addCollaborator(invitation.quizId, userEmail.toLowerCase());

    // Update invitation status
    await updateDoc(invRef, {
        status: 'accepted'
    });

    return invitation.quizId;
};

export const markNotificationAsRead = async (id: string) => {
    const docRef = doc(db, "notifications", id);
    await updateDoc(docRef, { read: true });
};

export const updateQuizPresence = async (quizId: string, userId: string, userName: string, editingQuestionId: string | null) => {
    const presenceRef = doc(db, "quiz_presence", `${quizId}_${userId}`);
    await setDoc(presenceRef, {
        quizId,
        userId,
        userName,
        editingQuestionId,
        lastActive: serverTimestamp()
    });
};

export const subscribeToQuizPresence = (quizId: string, callback: (presences: UserPresence[]) => void) => {
    const q = query(collection(db, "quiz_presence"), where("quizId", "==", quizId));
    return onSnapshot(q, (snapshot) => {
        const presences = snapshot.docs.map(doc => doc.data() as UserPresence);
        callback(presences);
    });
};

export const removeQuizPresence = async (quizId: string, userId: string) => {
    const presenceRef = doc(db, "quiz_presence", `${quizId}_${userId}`);
    await deleteDoc(presenceRef);
};
