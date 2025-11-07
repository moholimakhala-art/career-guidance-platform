import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, userData, loading, isAuthenticated } = useAuth();

  console.log('🛡️ ProtectedRoute Debug:', {
    user: user?.uid,
    userData,
    loading,
    isAuthenticated,
    allowedRoles,
    userRole: userData?.role
  });

  // Show loading while checking authentication
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        flexDirection: 'column'
      }}>
        <div>Checking authentication...</div>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
          User: {user ? user.uid : 'No user'}
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    console.log('❌ ProtectedRoute: No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (allowedRoles.length > 0 && userData?.role) {
    if (!allowedRoles.includes(userData.role)) {
      console.log('🚫 ProtectedRoute: Role mismatch', {
        userRole: userData.role,
        allowedRoles
      });
      return <Navigate to="/unauthorized" replace />;
    }
  }

  console.log('✅ ProtectedRoute: Access granted for role:', userData?.role);
  return children;
};

export default ProtectedRoute;