import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyClMieBCg9yeqEx2moK2y45ZbchkKKXfG4",
  authDomain: "chat-app-c09ee.firebaseapp.com",
  projectId: "chat-app-c09ee",
  storageBucket: "chat-app-c09ee.firebasestorage.app",
  messagingSenderId: "910568253584",
  appId: "1:910568253584:web:fbf7f3529c0cf077b9d015",
  measurementId: "G-7Y3MX7Q583"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
