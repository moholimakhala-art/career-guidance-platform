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
      console.log('🔄 Auth state changed:', firebaseUser ? firebaseUser.uid : 'No user');
      
      setLoading(true);
      
      if (firebaseUser) {
        // User is signed in
        setUser(firebaseUser);
        
        try {
          console.log('📄 Fetching user data from Firestore for UID:', firebaseUser.uid);
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('✅ User data loaded:', { 
              uid: userData.uid, 
              email: userData.email, 
              role: userData.role 
            });
            setUserData(userData);
          } else {
            console.log('⚠️ User authenticated but no data in Firestore');
            
            // Create a minimal user data object to prevent crashes
            const minimalUserData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: 'student', // default role
              emailVerified: firebaseUser.emailVerified,
              profileCompleted: false
            };
            
            console.log('🔄 Creating minimal user data for session');
            setUserData(minimalUserData);
          }
        } catch (error) {
          console.error('❌ Error fetching user data:', error);
          
          // Create fallback user data to prevent crashes
          const fallbackUserData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: 'student',
            emailVerified: firebaseUser.emailVerified,
            profileCompleted: false
          };
          
          setUserData(fallbackUserData);
        }
      } else {
        console.log('🚪 No user signed in');
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
      
      // Clear any previous state
      setLoading(true);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log('✅ Firebase auth successful, user:', user.uid);
      console.log('📧 Email verified status:', user.emailVerified);
      
      // Check if email is verified - BLOCK LOGIN IF NOT VERIFIED
      if (!user.emailVerified) {
        console.log('🚫 Login blocked: Email not verified');
        
        // Sign out the user since they can't access the app
        await signOut(auth);
        
        return { 
          success: false, 
          error: 'Please verify your email address before logging in. Check your inbox for the verification email.',
          emailVerified: false
        };
      }
      
      // Get user data from Firestore
      console.log('📄 Fetching user data from Firestore...');
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        console.error('❌ User document does not exist in Firestore');
        
        // Create a temporary user data object to allow login
        const tempUserData = {
          uid: user.uid,
          email: user.email,
          role: 'student',
          emailVerified: user.emailVerified,
          profileCompleted: false,
          temporary: true
        };
        
        console.log('🔄 Using temporary user data');
        setUserData(tempUserData);
        
        return { 
          success: true, 
          user: tempUserData, 
          userRole: 'student',
          emailVerified: user.emailVerified,
          temporary: true
        };
      }
      
      const userData = userDoc.data();
      console.log('✅ User document found:', { 
        uid: userData.uid, 
        email: userData.email, 
        role: userData.role 
      });
      
      // Update userData state
      setUserData(userData);
      
      console.log('🎉 Login successful, redirecting to:', `/${userData.role}`);
      
      return { 
        success: true, 
        user: userData, 
        userRole: userData.role,
        emailVerified: user.emailVerified 
      };
      
    } catch (error) {
      console.error('💥 Login error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let errorMessage = 'An error occurred during login. Please try again.';
      
      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
          errorMessage = 'Invalid email or password. Please check your credentials.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address format.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed login attempts. Please try again later.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled. Please contact support.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
        default:
          errorMessage = `Login failed: ${error.message}`;
      }
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email, password, role, additionalData = {}) => {
    let user = null;
    let userCreated = false;
    
    try {
      console.log('🚀 Starting signup process for:', email, 'Role:', role);
      
      // Step 1: Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      user = userCredential.user;
      userCreated = true;
      
      console.log('✅ Firebase user created with UID:', user.uid);
      
      // Step 2: Prepare comprehensive user data
      const userData = {
        uid: user.uid,
        email: email,
        role: role,
        createdAt: new Date(),
        updatedAt: new Date(),
        profileCompleted: false,
        emailVerified: false, // Always false initially
        status: 'active',
        ...additionalData
      };

      // Add role-specific default data
      if (role === 'student') {
        userData.name = additionalData.name || '';
        userData.academicResults = {};
        userData.documents = {
          cv: null,
          transcript: null,
          otherDocuments: []
        };
        userData.applications = [];
      } else if (role === 'institution') {
        userData.name = additionalData.name || '';
        userData.institutionName = additionalData.name || '';
        userData.phone = additionalData.phone || '';
        userData.address = additionalData.address || '';
        userData.courses = [];
      } else if (role === 'company') {
        userData.name = additionalData.name || '';
        userData.companyName = additionalData.name || '';
        userData.phone = additionalData.phone || '';
        userData.address = additionalData.address || '';
        userData.jobs = [];
      } else if (role === 'admin') {
        userData.name = additionalData.name || 'Administrator';
      }

      console.log('💾 Saving user data to Firestore...');
      
      // Step 3: Save user document to Firestore
      await setDoc(doc(db, 'users', user.uid), userData);
      console.log('✅ User document created successfully');

      // Step 4: Wait briefly to ensure Firestore write is complete
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('📧 Sending verification email...');
      // Step 5: Send email verification
      await sendEmailVerification(user);
      console.log('✅ Verification email sent');

      // Step 6: Create role-specific documents if needed
      if (role === 'institution' && additionalData.name) {
        try {
          console.log('🏫 Creating institution document...');
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
          console.log('✅ Institution document created successfully');
        } catch (institutionError) {
          console.error('⚠️ Error creating institution document:', institutionError);
          // Continue - user account is the main priority
        }
      } else if (role === 'company' && additionalData.name) {
        try {
          console.log('🏢 Creating company document...');
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
          console.log('✅ Company document created successfully');
        } catch (companyError) {
          console.error('⚠️ Error creating company document:', companyError);
          // Continue - user account is the main priority
        }
      }
      
      console.log('🎉 User registration completed successfully');
      
      // Update local state
      setUserData(userData);
      
      return { 
        success: true, 
        user: userData,
        userRole: role,
        message: 'Registration successful! Please check your email for the verification link.' 
      };
      
    } catch (error) {
      console.error('❌ Signup error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // Clean up if user was created but something else failed
      if (userCreated && user) {
        try {
          console.log('🧹 Cleaning up failed signup...');
          
          // Delete the auth user
          await user.delete();
          console.log('✅ Auth user cleaned up');
          
          // Try to delete Firestore documents
          try {
            await deleteDoc(doc(db, 'users', user.uid));
            console.log('✅ User document cleaned up');
          } catch (firestoreError) {
            console.log('ℹ️ No user document to clean up');
          }
          
          // Clean up role-specific documents
          if (role === 'institution') {
            try {
              await deleteDoc(doc(db, 'institutions', user.uid));
            } catch (e) { /* ignore */ }
          } else if (role === 'company') {
            try {
              await deleteDoc(doc(db, 'companies', user.uid));
            } catch (e) { /* ignore */ }
          }
          
        } catch (deleteError) {
          console.error('⚠️ Failed to clean up user account:', deleteError);
        }
      }
      
      let errorMessage = 'An error occurred during registration. Please try again.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists. Please use a different email or try logging in.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Please use at least 6 characters.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address format.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password accounts are not enabled. Please contact support.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
        case 'permission-denied':
          errorMessage = 'Database permission denied. Please check your Firebase security rules.';
          break;
        default:
          errorMessage = `Registration failed: ${error.message}`;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const resendVerificationEmail = async (email) => {
    try {
      // If no specific email provided, use current user
      if (!email && user) {
        await sendEmailVerification(user);
        return { 
          success: true, 
          message: 'Verification email sent! Please check your inbox.' 
        };
      }
      
      // If email is provided, we need to sign in the user first to resend verification
      if (email) {
        return { 
          success: false, 
          error: 'Please log in first to resend verification email, or use the password reset feature if you cannot access your account.' 
        };
      }
      
      return { 
        success: false, 
        error: 'No user is currently logged in.' 
      };
    } catch (error) {
      console.error('❌ Resend verification error:', error);
      return { 
        success: false, 
        error: 'Failed to send verification email. Please try again.' 
      };
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
      console.error('❌ Password reset error:', error);
      
      let errorMessage = 'Failed to send password reset email.';
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
      console.log('🚪 Logging out user...');
      await signOut(auth);
      setUser(null);
      setUserData(null);
      console.log('✅ Logout successful');
      return { success: true };
    } catch (error) {
      console.error('❌ Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  const updateUserProfile = async (updates) => {
    try {
      if (!user) {
        return { success: false, error: 'No user is currently logged in.' };
      }
      
      const updatedData = {
        ...updates,
        updatedAt: new Date()
      };
      
      await setDoc(doc(db, 'users', user.uid), updatedData, { merge: true });
      
      // Update local state
      setUserData(prev => ({ ...prev, ...updatedData }));
      
      return { success: true };
    } catch (error) {
      console.error('❌ Update profile error:', error);
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
    // User state
    currentUser: user,
    user: user,
    userData: userData,
    userRole: userData?.role,
    loading,
    isAuthenticated: !!user,
    emailVerified: user?.emailVerified || false,
    
    // Auth methods
    login,
    signup,
    logout,
    resendVerificationEmail,
    resetPassword,
    updateUserProfile,
    
    // Permissions
    hasPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};