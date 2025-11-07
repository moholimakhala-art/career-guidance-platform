import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDGlk93fbmY1ZQy-wiXHZq-j7i86vuOqtY",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "career-guidance-lesotho-dac6f.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "career-guidance-lesotho-dac6f",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "career-guidance-lesotho-dac6f.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "832497506089",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:832497506089:web:53a0e3041fed83239ec938"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;