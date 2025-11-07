import React, { useState, useEffect } from 'react';
import { applicationService } from '../../services/firebaseService';
import { useAuth } from '../../context/AuthContext';

function CourseApplicationForm({ course, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    studentName: '',
    email: '',
    qualifications: '',
    previousSchool: '',
    birthDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { user, userData, refreshUserData } = useAuth();

  // Pre-fill form with user data
  useEffect(() => {
    if (userData) {
      setFormData(prev => ({
        ...prev,
        studentName: userData.name || '',
        email: userData.email || user?.email || ''
      }));
    } else if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || ''
      }));
    }
  }, [user, userData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to apply for courses.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Validate form data
      if (!formData.studentName || !formData.email || !formData.birthDate || !formData.previousSchool || !formData.qualifications) {
        setError('Please fill in all required fields.');
        setLoading(false);
        return;
      }

      const applicationData = {
        studentId: user.uid,
        studentName: formData.studentName,
        studentEmail: formData.email,
        courseId: course.id,
        courseName: course.name,
        institutionId: course.institutionId || 'unknown',
        institutionName: course.institution,
        qualifications: formData.qualifications,
        previousSchool: formData.previousSchool,
        birthDate: formData.birthDate,
        status: 'pending',
        appliedDate: new Date(),
        applicationId: `APP${Date.now()}${Math.random().toString(36).substr(2, 5)}`
      };

      console.log('📝 Submitting application:', applicationData);
      
      const response = await applicationService.submitApplication(applicationData);
      
      if (response.success) {
        console.log('✅ Application submitted successfully:', response);
        
        // Refresh user data to ensure consistency
        await refreshUserData?.();
        
        // Call success callback with complete application data
        onSuccess({
          id: response.id,
          applicationId: applicationData.applicationId,
          ...applicationData
        });
      } else {
        throw new Error(response.error || 'Failed to submit application');
      }
    } catch (err) {
      console.error('❌ Application error:', err);
      setError(err.message || 'Error submitting application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}
      onClick={handleBackdropClick}
    >
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '10px',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '2px solid #f0f0f0',
          paddingBottom: '15px'
        }}>
          <div>
            <h2 style={{ margin: 0, color: '#2c3e50' }}>Apply for {course.name}</h2>
            <p style={{ margin: '5px 0 0 0', color: '#7f8c8d', fontSize: '14px' }}>
              {course.institution}
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '28px',
              cursor: 'pointer',
              color: '#7f8c8d',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#f0f0f0'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            ×
          </button>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '12px',
            borderRadius: '5px',
            marginBottom: '20px',
            border: '1px solid #f5c6cb'
          }}>
            <strong>⚠️ Error:</strong> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50' }}>
              Full Name *
            </label>
            <input
              type="text"
              name="studentName"
              value={formData.studentName}
              onChange={handleChange}
              required
              style={inputStyle}
              placeholder="Enter your full name"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50' }}>
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={inputStyle}
              placeholder="your.email@example.com"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50' }}>
              Date of Birth *
            </label>
            <input
              type="date"
              name="birthDate"
              value={formData.birthDate}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50' }}>
              Previous School *
            </label>
            <input
              type="text"
              name="previousSchool"
              value={formData.previousSchool}
              onChange={handleChange}
              required
              style={inputStyle}
              placeholder="E.g., Lesotho High School, Maseru"
            />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50' }}>
              Qualifications and Achievements *
            </label>
            <textarea
              name="qualifications"
              value={formData.qualifications}
              onChange={handleChange}
              required
              rows="5"
              style={{ ...inputStyle, resize: 'vertical', minHeight: '120px' }}
              placeholder="List your high school subjects, grades, certificates, and any other relevant achievements..."
            />
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '15px', 
            justifyContent: 'flex-end',
            borderTop: '1px solid #f0f0f0',
            paddingTop: '20px'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '12px 24px',
                backgroundColor: '#95a5a6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#7f8c8d')}
              onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#95a5a6')}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 24px',
                backgroundColor: loading ? '#95a5a6' : '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#219a52')}
              onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#27ae60')}
            >
              {loading ? (
                <>
                  <span style={{ marginRight: '8px' }}>⏳</span>
                  Submitting...
                </>
              ) : (
                <>
                  <span style={{ marginRight: '8px' }}>📨</span>
                  Submit Application
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '12px',
  border: '2px solid #e1e5e9',
  borderRadius: '6px',
  fontSize: '16px',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  fontFamily: 'inherit'
};

// Add focus styles
const inputStyleWithFocus = {
  ...inputStyle,
  ':focus': {
    borderColor: '#3498db',
    boxShadow: '0 0 0 3px rgba(52, 152, 219, 0.1)',
    outline: 'none'
  }
};

export default CourseApplicationForm;