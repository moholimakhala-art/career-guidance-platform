import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navigation from './components/common/Navigation';
import Footer from './components/common/Footer';
import Login from './components/common/Login';
import ProtectedRoute from './components/common/ProtectedRoute';
import StudentDashboard from './pages/Student/StudentDashboard';
import AdminDashboard from './pages/Admin/AdminDashboard';
import InstitutionDashboard from './pages/Institution/Dashboard';
import CompanyDashboard from './pages/Company/CompanyDashboard';
import HomePage from './pages/HomePage';
import Unauthorized from './pages/Unauthorized';
import { initializeFirebaseData } from './services/initFirebase';
import './App.css';

function App() {
  useEffect(() => {
    initializeFirebaseData();
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navigation />
          
          <main>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              
              {/* Protected Routes */}
              <Route path="/student" element={
                <ProtectedRoute allowedRoles={['student', 'admin', 'institution', 'company']}>
                  <StudentDashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin', 'student', 'institution', 'company']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/institution" element={
                <ProtectedRoute allowedRoles={['institution', 'admin', 'student', 'company']}>
                  <InstitutionDashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/company" element={
                <ProtectedRoute allowedRoles={['company', 'admin', 'student', 'institution']}>
                  <CompanyDashboard />
                </ProtectedRoute>
              } />
              
              {/* Catch all route */}
              <Route path="*" element={<HomePage />} />
            </Routes>
          </main>

          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;