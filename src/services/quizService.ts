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
    setDoc,
    increment
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
  wrongQuestions?: Question[];
  subject?: string;
  quizTitle?: string;
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
  views?: number;
  subject?: string; // Group quizzes by subject
  chapter?: number; // Order/Number of the chapter
  chapterName?: string; // Chapter name
  shuffleOptions?: boolean; // Whether to shuffle options during practice/exam
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
  type: 'quiz_complete' | 'comment' | 'missing_answer' | 'invitation' | 'report';
  title: string;
  message: string;
  link: string;
  read: boolean;
  createdAt: any;
}

export interface QuestionReport {
  id?: string;
  quizId: string;
  quizTitle: string;
  questionText: string;
  questionIndex: number;
  questionId: string;
  reason: string;
  userId: string;
  userName: string;
  authorEmail?: string;
  createdAt: any;
  status: 'pending' | 'resolved';
  resolvedBy?: string;
  resolvedByName?: string;
  resolvedAt?: any;
}

export interface QuizView {
  id?: string;
  quizId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  viewedAt: any;
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
        const isGuest = !result.userId || result.userId === "guest";
        let q;
        if (isGuest) {
            q = query(
                collection(db, "quiz_results"),
                where("quizId", "==", result.quizId),
                where("userName", "==", result.userName),
                where("userId", "==", "guest")
            );
        } else {
            q = query(
                collection(db, "quiz_results"),
                where("quizId", "==", result.quizId),
                where("userId", "==", result.userId)
            );
        }
        
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            // Document already exists, compare scores
            const existingDoc = snapshot.docs[0];
            const existingData = existingDoc.data() as QuizResult;
            
            const isBetterScore = result.score > existingData.score;
            const isEqualScoreBetterTime = result.score === existingData.score && result.timeTakenMs < existingData.timeTakenMs;
            
            if (isBetterScore || isEqualScoreBetterTime) {
                const docRef = doc(db, "quiz_results", existingDoc.id);
                await updateDoc(docRef, {
                    score: result.score,
                    timeTakenMs: result.timeTakenMs,
                    wrongQuestions: result.wrongQuestions || [],
                    createdAt: serverTimestamp()
                });
            }
        } else {
            // No existing document, add new record
            await addDoc(collection(db, "quiz_results"), {
                ...result,
                createdAt: serverTimestamp()
            });
        }
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
            limit(50) // Fetch more to filter unique users
        );
        const snapshot = await getDocs(q);
        const allResults = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as QuizResult));
        
        // Filter unique users, keeping the best (first one due to ordering)
        const uniqueResults: QuizResult[] = [];
        const seenUsers = new Set<string>();
        
        for (const res of allResults) {
            const userKey = (res.userId && res.userId !== "guest") ? res.userId : `guest-${res.userName}`;
            if (!seenUsers.has(userKey)) {
                seenUsers.add(userKey);
                uniqueResults.push(res);
            }
            if (uniqueResults.length >= 10) break;
        }
        
        return uniqueResults;
    } catch (error) {
        console.error("Error fetching leaderboard. Make sure indexes are created.", error);
        return [];
    }
};

export const getQuizResults = async (quizId: string): Promise<QuizResult[]> => {
    try {
        const q = query(
            collection(db, "quiz_results"), 
            where("quizId", "==", quizId),
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as QuizResult));
    } catch (error) {
        console.error("Error fetching results:", error);
        return [];
    }
};

export const getUserQuizResults = async (userId: string): Promise<QuizResult[]> => {
    try {
        const q = query(
            collection(db, "quiz_results"), 
            where("userId", "==", userId),
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as QuizResult));
    } catch (error) {
        console.error("Error fetching user results:", error);
        return [];
    }
};

export const saveMockExamResult = async (result: any) => {
    try {
        await addDoc(collection(db, "mock_exam_results"), {
            ...result,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error saving mock result:", error);
        throw error;
    }
};

export const getMockExamLeaderboard = async (subject: string): Promise<any[]> => {
    try {
        const q = query(
            collection(db, "mock_exam_results"),
            where("subject", "==", subject),
            orderBy("score", "desc"),
            orderBy("timeTakenMs", "asc"),
            limit(10)
        );
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error("Error fetching mock leaderboard:", e);
        return [];
    }
};

export const getQuizResultById = async (resultId: string): Promise<QuizResult | null> => {
    try {
        const docRef = doc(db, "quiz_results", resultId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            return { id: snap.id, ...snap.data() } as QuizResult;
        }
        return null;
    } catch (error) {
        console.error("Error fetching result:", error);
        return null;
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

export const recordQuizView = async (quizId: string, userId: string, userName: string, userEmail?: string) => {
    const quizRef = doc(db, "quizzes", quizId);
    await updateDoc(quizRef, { views: increment(1) });

    const viewRef = collection(db, "quiz_views");
    await addDoc(viewRef, {
        quizId,
        userId,
        userName,
        userEmail: userEmail || null,
        viewedAt: serverTimestamp()
    });
};

export const getQuizViewers = async (quizId: string) => {
    const q = query(
        collection(db, "quiz_views"),
        where("quizId", "==", quizId),
        orderBy("viewedAt", "desc"),
        limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as QuizView[];
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
    const q = query(collection(db, "quizzes"), where("visibility", "!=", "private"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as QuizData));
};

export const getQuizzesBySubject = async (subject: string, excludeId?: string, limitCount?: number): Promise<QuizData[]> => {
    if (!subject) return [];
    const q = query(
        collection(db, "quizzes"), 
        where("subject", "==", subject),
        where("visibility", "==", "public"),
        limit(limitCount || 5)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as QuizData))
        .filter(q => q.id !== excludeId);
};

export const getMockExamQuestions = async (subject: string): Promise<Question[]> => {
    try {
        // Fetch more quizzes to get a diverse pool of questions
        const quizzes = await getQuizzesBySubject(subject, undefined, 50);
        
        let allQuestions: Question[] = [];
        quizzes.forEach(quiz => {
            const filtered = quiz.questions.filter(q => 
                q.type === 'open' || (q.correctAnswer && q.correctAnswer.length > 0)
            );
            allQuestions = [...allQuestions, ...filtered];
        });
        
        // Shuffle and pick 40
        const shuffled = allQuestions.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 40);
    } catch (error) {
        console.error("Error fetching mock questions:", error);
        return [];
    }
};

export const getAllSubjectQuestions = async (subject: string): Promise<Question[]> => {
    try {
        // Fetch all quizzes for this subject (up to 100 for now)
        const quizzes = await getQuizzesBySubject(subject, undefined, 100);
        
        let allQuestions: Question[] = [];
        quizzes.forEach(quiz => {
            const filtered = quiz.questions.filter(q => 
                q.type === 'open' || (q.correctAnswer && q.correctAnswer.length > 0)
            );
            allQuestions = [...allQuestions, ...filtered];
        });
        
        // Return shuffled questions
        return allQuestions.sort(() => Math.random() - 0.5);
    } catch (error) {
        console.error("Error fetching all subject questions:", error);
        return [];
    }
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

export const reportQuestionIssue = async (report: Omit<QuestionReport, "id" | "createdAt" | "status">) => {
    try {
        const docRef = await addDoc(collection(db, "question_reports"), {
            ...report,
            status: 'pending',
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error reporting question:", error);
        throw error;
    }
};

export const getQuizReports = async (quizId: string): Promise<QuestionReport[]> => {
    try {
        const q = query(
            collection(db, "question_reports"),
            where("quizId", "==", quizId),
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as QuestionReport));
    } catch (error) {
        console.error("Error fetching reports:", error);
        return [];
    }
};

export const updateReportStatus = async (reportId: string, status: 'pending' | 'resolved', resolver?: { uid: string, name: string }) => {
    const reportRef = doc(db, "question_reports", reportId);
    const updates: any = { status };
    if (resolver && status === 'resolved') {
        updates.resolvedBy = resolver.uid;
        updates.resolvedByName = resolver.name;
        updates.resolvedAt = serverTimestamp();
    }
    await updateDoc(reportRef, updates);
};

export const resolveReportWithAnswer = async (report: QuestionReport, newAnswer: string[], resolver: { uid: string, name: string }) => {
    // 1. Update the report
    await updateReportStatus(report.id!, 'resolved', resolver);

    // 2. Update the quiz question
    const quizRef = doc(db, "quizzes", report.quizId);
    const quizSnap = await getDoc(quizRef);
    if (quizSnap.exists()) {
        const quizData = quizSnap.data() as QuizData;
        const updatedQuestions = quizData.questions.map((q, idx) => {
            // Match by ID if available, otherwise by index
            const isMatch = (report.questionId && q.id === report.questionId) || 
                            (!report.questionId && idx === report.questionIndex);
            
            if (isMatch) {
                return { ...q, correctAnswer: newAnswer };
            }
            return q;
        });
        await updateDoc(quizRef, { questions: updatedQuestions });
    }
};

export const syncSubjectWrongQuestions = async (userId: string, subject: string, results: { question: Question, isCorrect: boolean }[]) => {
    if (!userId || userId === "guest" || !subject) return;

    for (const res of results) {
        const docId = `${userId}_${subject}_${res.question.id}`;
        const docRef = doc(db, "subject_wrong_questions", docId);

        if (res.isCorrect) {
            // If correct, remove from wrong questions pool
            await deleteDoc(docRef);
        } else {
            // If wrong, add or update in pool
            await setDoc(docRef, {
                userId,
                subject,
                question: res.question,
                questionId: res.question.id,
                updatedAt: serverTimestamp()
            });
        }
    }
};

export const getSubjectWrongQuestions = async (userId: string, subject: string): Promise<Question[]> => {
    if (!userId || userId === "guest" || !subject) return [];

    try {
        const q = query(
            collection(db, "subject_wrong_questions"),
            where("userId", "==", userId),
            where("subject", "==", subject),
            orderBy("updatedAt", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data().question as Question);
    } catch (error) {
        console.error("Error fetching subject wrong questions:", error);
        return [];
    }
};
