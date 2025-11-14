import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

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
            console.warn(' User document not found - this may be normal during signup');
            
            // Instead of signing out, wait and retry once
            console.log(' Waiting and retrying Firestore fetch...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const retryDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (retryDoc.exists()) {
              const userData = retryDoc.data();
              console.log(' User data found on retry:', userData);
              setUserData(userData);
            } else {
              console.error(' User document still not found after retry');
              // Only sign out if we're confident this isn't a new signup
              // For now, just set empty userData and let the user flow handle it
              setUserData(null);
            }
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
      console.log('🔐 Attempting login with:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log('✅ Firebase auth successful, user:', user.uid);
      console.log('📧 Email verified status:', user.emailVerified);
      
      // Verify user data exists in Firestore and get their actual role
      console.log('📄 Checking user document in Firestore...');
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        console.error('❌ User document does not exist in Firestore');
        
        // Instead of auto-signout, give it a retry
        console.log('🔄 Retrying Firestore fetch...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const retryDoc = await getDoc(doc(db, 'users', user.uid));
        if (!retryDoc.exists()) {
          console.error('❌ User document still not found after retry');
          await signOut(auth);
          return { 
            success: false, 
            error: 'Account data not found. Please contact support.' 
          };
        } else {
          console.log('✅ User document found on retry');
          const userData = retryDoc.data();
          setUserData(userData);
          return { 
            success: true, 
            user, 
            userRole: userData.role,
            emailVerified: user.emailVerified 
          };
        }
      }
      
      const userData = userDoc.data();
      console.log('✅ User document found:', userData);
      console.log('🎭 User role:', userData.role);
      
      // Check if email is verified - but don't auto-signout
      if (!user.emailVerified) {
        console.log('⚠️ Email not verified yet, but allowing access');
        // Don't sign out - just show a warning but allow login
      }
      
      // Update userData state immediately so it's available for redirects
      setUserData(userData);
      
      console.log('🎉 Firebase login successful');
      return { 
        success: true, 
        user, 
        userRole: userData.role,
        emailVerified: user.emailVerified 
      };
    } catch (error) {
      console.error('💥 Login error details:');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      
      let errorMessage = 'An error occurred during login. Please try again.';
      
      if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled. Please contact support.';
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const signup = async (email, password, role, additionalData = {}) => {
    let user = null;
    
    try {
      console.log(' Starting signup process for:', email, 'Role:', role);
      
      // Step 1: Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      user = userCredential.user;
      
      console.log(' Firebase user created with UID:', user.uid);
      
      // Step 2: Prepare user data
      const userData = {
        uid: user.uid,
        email: email,
        role: role,
        createdAt: new Date(),
        profileCompleted: false,
        emailVerified: false,
        status: 'active',
        ...additionalData
      };

      // Add role-specific data
      if (role === 'student') {
        userData.name = additionalData.name || email.split('@')[0];
        userData.documents = {
          cv: null,
          transcript: null,
          otherDocuments: []
        };
      } else if (role === 'institution') {
        userData.name = additionalData.name || email.split('@')[0];
        userData.institutionName = additionalData.name;
        userData.phone = additionalData.phone || '';
        userData.address = additionalData.address || '';
      } else if (role === 'company') {
        userData.name = additionalData.name || email.split('@')[0];
        userData.companyName = additionalData.name;
        userData.phone = additionalData.phone || '';
        userData.address = additionalData.address || '';
      } else if (role === 'admin') {
        userData.name = additionalData.name || 'Administrator';
      }

      console.log(' Saving user data to Firestore...');
      
      // Step 3: Save user document FIRST (before email verification)
      await setDoc(doc(db, 'users', user.uid), userData);
      console.log(' User document created successfully');

      // Step 4: Wait a moment to ensure Firestore write is complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(' Sending verification email...');
      // Step 5: Send email verification
      await sendEmailVerification(user);
      console.log(' Verification email sent');

      // Step 6: Create role-specific documents
      if (role === 'institution') {
        try {
          console.log(' Creating institution document with ID:', user.uid);
          const institutionData = {
            id: user.uid,
            name: additionalData.name,
            email: email,
            phone: additionalData.phone || '',
            address: additionalData.address || '',
            status: 'active',
            createdAt: new Date(),
            createdBy: user.uid
          };
          
          await setDoc(doc(db, 'institutions', user.uid), institutionData);
          console.log(' Institution document created successfully');
        } catch (institutionError) {
          console.error(' Error creating institution document:', institutionError);
          // Continue anyway - user account is created
        }
      } else if (role === 'company') {
        try {
          console.log(' Creating company document with ID:', user.uid);
          const companyData = {
            id: user.uid,
            name: additionalData.name,
            email: email,
            phone: additionalData.phone || '',
            address: additionalData.address || '',
            status: 'active',
            createdAt: new Date(),
            createdBy: user.uid
          };
          
          await setDoc(doc(db, 'companies', user.uid), companyData);
          console.log(' Company document created successfully');
        } catch (companyError) {
          console.error(' Error creating company document:', companyError);
          // Continue anyway - user account is created
        }
      }
      
      console.log(' User registration completed successfully');
      
      return { 
        success: true, 
        user,
        userRole: role,
        message: 'Registration successful! Please check your email for the verification link.' 
      };
    } catch (error) {
      console.error(' Signup error:', error);
      console.error(' Error code:', error.code);
      console.error(' Error message:', error.message);
      
      // If user was created but something else failed, try to clean up
      if (user) {
        try {
          // Delete the auth user
          await user.delete();
          console.log('Cleaned up user account due to signup failure');
          
          // Also try to delete any Firestore documents that might have been created
          try {
            await deleteDoc(doc(db, 'users', user.uid));
          } catch (firestoreError) {
            console.log('No user document to clean up');
          }
        } catch (deleteError) {
          console.error('Failed to clean up user account:', deleteError);
        }
      }
      
      let errorMessage = 'An error occurred during registration. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists. Please use a different email or try logging in.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use at least 6 characters.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/password accounts are not enabled. Please contact support.';
      } else if (error.code === 'permission-denied') {
        errorMessage = 'Database permission denied. Please check your Firebase security rules.';
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const resendVerificationEmail = async () => {
    try {
      if (!user) {
        return { success: false, error: 'No user is currently logged in.' };
      }
      
      await sendEmailVerification(user);
      return { 
        success: true, 
        message: 'Verification email sent! Please check your inbox.' 
      };
    } catch (error) {
      console.error(' Resend verification error:', error);
      return { success: false, error: error.message };
    }
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { 
        success: true, 
        message: 'Password reset email sent! Please check your inbox.' 
      };
    } catch (error) {
      console.error(' Password reset error:', error);
      
      let errorMessage = error.message;
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserData(null);
      return { success: true };
    } catch (error) {
      console.error(' Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  const updateUserProfile = async (updates) => {
    try {
      if (!user) {
        return { success: false, error: 'No user is currently logged in.' };
      }
      
      await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
      setUserData(prev => ({ ...prev, ...updates }));
      return { success: true };
    } catch (error) {
      console.error(' Update profile error:', error);
      return { success: false, error: error.message };
    }
  };

  // Check if user has permission for certain actions
  const hasPermission = (requiredRole) => {
    if (!userData) return false;
    
    // Admin has all permissions
    if (userData.role === 'admin') return true;
    
    // Check if user role matches required role
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(userData.role);
    }
    
    return userData.role === requiredRole;
  };

  const value = {
    currentUser: user,
    user: user,
    userData: userData,
    userRole: userData?.role,
    login,
    signup,
    logout,
    loading,
    isAuthenticated: !!user,
    emailVerified: user?.emailVerified || false,
    
    resendVerificationEmail,
    resetPassword,
    updateUserProfile,
    
    hasPermission
  };

  console.log('🔄 AuthContext value:', { 
    user: user?.uid, 
    userData, 
    loading,
    isAuthenticated: !!user,
    emailVerified: user?.emailVerified,
    role: userData?.role
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};