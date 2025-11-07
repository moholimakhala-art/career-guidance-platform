import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDGlk93fbmY1ZQy-wiXHZq-j7i86vuOqtY",
  authDomain: "career-guidance-lesotho-dac6f.firebaseapp.com",
  projectId: "career-guidance-lesotho-dac6f",
  storageBucket: "career-guidance-lesotho-dac6f.firebasestorage.app",
  messagingSenderId: "832497506089",
  appId: "1:832497506089:web:53a0e3041fed83239ec938"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;