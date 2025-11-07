import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log(' Auth state changed:', firebaseUser ? firebaseUser.uid : 'No user');
      
      setLoading(true);
      
      if (firebaseUser) {
        // User is signed in
        setUser(firebaseUser);
        
        try {
          console.log(' Fetching user data from Firestore for UID:', firebaseUser.uid);
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log(' User data loaded:', userData);
            setUserData(userData);
          } else {
            console.log(' User authenticated but no data in Firestore');
            const defaultUserData = {
              email: firebaseUser.email,
              role: 'student',
              name: firebaseUser.email.split('@')[0],
              createdAt: new Date(),
              profileCompleted: false
            };
            
            await setDoc(doc(db, 'users', firebaseUser.uid), defaultUserData);
            setUserData(defaultUserData);
          }
        } catch (error) {
          console.error(' Error fetching user data:', error);
          setUserData(null);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    try {
      console.log(' Attempting login with:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log(' Firebase login successful');
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error(' Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const signup = async (email, password, role, name) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const userData = {
        email: email,
        role: role,
        name: name,
        createdAt: new Date(),
        profileCompleted: false,
        uid: user.uid
      };
      
      await setDoc(doc(db, 'users', user.uid), userData);
      return { success: true, user };
    } catch (error) {
      console.error(' Signup error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error(' Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    // For compatibility with existing code
    currentUser: user,
    user: user,
    userData: userData,
    userRole: userData?.role,
    login,
    signup,
    logout,
    loading,
    isAuthenticated: !!user
  };

  console.log('🔄 AuthContext value:', { 
    user: user?.uid, 
    userData, 
    loading,
    isAuthenticated: !!user 
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};