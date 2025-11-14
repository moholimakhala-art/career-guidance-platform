import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Validation functions
  const validateName = (name) => {
    const nameRegex = /^[A-Za-z\s]+$/;
    if (!name.trim()) return 'Name is required';
    if (!nameRegex.test(name)) return 'Name can only contain letters and spaces';
    if (name.length < 2) return 'Name must be at least 2 characters long';
    if (name.length > 50) return 'Name cannot exceed 50 characters';
    return '';
  };

  const validateEmail = (email) => {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!email.trim()) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return '';
  };

  const validatePassword = (password) => {
    if (!password) return 'Password is required';
    if (isSignUp && password.length < 6) return 'Password must be at least 6 characters long';
    return '';
  };

  const validateRequiredField = (value, fieldName) => {
    if (!value.trim()) return `${fieldName} is required`;
    return '';
  };

  const validateForm = () => {
    const errors = {};

    if (isSignUp) {
      if (role === 'student') {
        const nameError = validateName(name);
        if (nameError) errors.name = nameError;
      } else if (role === 'institution') {
        const institutionError = validateRequiredField(institutionName, 'Institution name');
        if (institutionError) errors.institutionName = institutionError;
      } else if (role === 'company') {
        const companyError = validateRequiredField(companyName, 'Company name');
        if (companyError) errors.companyName = companyError;
      }
    }

    const emailError = validateEmail(email);
    if (emailError) errors.email = emailError;

    const passwordError = validatePassword(password);
    if (passwordError) errors.password = passwordError;

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Validate form before submission
    if (!validateForm()) {
      setError('Please fix the form errors below');
      return;
    }

    setLoading(true);

    let result;
    try {
      if (isSignUp) {
        // Prepare additional data based on role
        let additionalData = {};
        
        if (role === 'student') {
          additionalData = { name: name.trim() };
        } else if (role === 'institution') {
          additionalData = { 
            name: institutionName.trim(),
            phone: phone.trim(),
            address: address.trim()
          };
        } else if (role === 'company') {
          additionalData = { 
            name: companyName.trim(),
            phone: phone.trim(),
            address: address.trim()
          };
        }

        // Sign up new user
        console.log('Starting signup process...');
        result = await signup(email, password, role, additionalData);
        
        if (result.success) {
          setSuccessMessage('Registration successful! Please check your email to verify your account before logging in.');
          // Clear form
          setName('');
          setInstitutionName('');
          setCompanyName('');
          setPhone('');
          setAddress('');
          setEmail('');
          setPassword('');
          
          console.log('Signup successful - user should verify email before logging in');
          // Don't redirect - user needs to verify email first
        } else {
          setError(result.error || 'Signup failed. Please try again.');
        }
      } else {
        // Log in existing user
        console.log('Attempting login...');
        result = await login(email, password);
        
        if (result.success) {
          console.log('Login successful, user role:', result.userRole);
          
          // Get the actual user role from the login result
          const userRole = result.userRole || 'student';
          const from = location.state?.from?.pathname || `/${userRole}`;
          
          console.log('Redirecting to:', from, 'for role:', userRole);
          
          // Small delay to ensure state is updated before navigation
          setTimeout(() => {
            navigate(from, { replace: true });
          }, 100);
        } else {
          setError(result.error || 'Login failed. Please try again.');
        }
      }
    } catch (err) {
      console.error('Auth process error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (value) => {
    const cleanedValue = value.replace(/[^A-Za-z\s]/g, '');
    setName(cleanedValue);
    
    if (fieldErrors.name) {
      setFieldErrors(prev => ({ ...prev, name: '' }));
    }
  };

  const handleInstitutionNameChange = (value) => {
    setInstitutionName(value);
    
    if (fieldErrors.institutionName) {
      setFieldErrors(prev => ({ ...prev, institutionName: '' }));
    }
  };

  const handleCompanyNameChange = (value) => {
    setCompanyName(value);
    
    if (fieldErrors.companyName) {
      setFieldErrors(prev => ({ ...prev, companyName: '' }));
    }
  };

  const handlePhoneChange = (value) => {
    // Allow only numbers, spaces, and common phone characters
    const cleanedValue = value.replace(/[^0-9\s+\-()]/g, '');
    setPhone(cleanedValue);
  };

  const handleAddressChange = (value) => {
    setAddress(value);
  };

  const handleEmailChange = (value) => {
    const cleanedValue = value.replace(/[^A-Za-z0-9.@_%+-]/g, '');
    setEmail(cleanedValue);
    
    if (fieldErrors.email) {
      setFieldErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const handlePasswordChange = (value) => {
    setPassword(value);
    
    if (fieldErrors.password) {
      setFieldErrors(prev => ({ ...prev, password: '' }));
    }
  };

  const handleRoleChange = (value) => {
    setRole(value);
    // Clear all field errors when role changes
    setFieldErrors({});
  };

  const handleToggleSignUp = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setSuccessMessage('');
    setFieldErrors({});
    if (!isSignUp) {
      // When switching to signup, clear all fields
      setName('');
      setInstitutionName('');
      setCompanyName('');
      setPhone('');
      setAddress('');
    } else {
      // When switching to login, reset role to default
      setRole('student');
      // Clear form fields
      setEmail('');
      setPassword('');
    }
  };

  // Helper function to render error message
  const renderError = (fieldName) => {
    return fieldErrors[fieldName] ? (
      <div style={{ 
        color: '#dc3545', 
        fontSize: '14px', 
        marginTop: '5px',
        display: 'flex',
        alignItems: 'center',
        gap: '5px'
      }}>
        <span style={{ fontSize: '16px' }}>⚠</span>
        {fieldErrors[fieldName]}
      </div>
    ) : null;
  };

  const inputStyle = (hasError) => ({
    width: '100%',
    padding: '10px',
    border: `1px solid ${hasError ? '#dc3545' : '#ddd'}`,
    borderRadius: '5px',
    fontSize: '16px',
    boxSizing: 'border-box',
    backgroundColor: hasError ? '#fff5f5' : 'white'
  });

  const getRoleDescription = () => {
    switch (role) {
      case 'student':
        return 'Search for courses and job opportunities, upload documents, and receive offers';
      case 'institution':
        return 'Manage courses, review student applications, and send course offers';
      case 'company':
        return 'Post job opportunities, review applications, and send job offers';
      case 'admin':
        return 'Manage system users, institutions, companies, and overall platform';
      default:
        return '';
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '80vh',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '10px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '450px'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#2c3e50' }}>
          {isSignUp ? 'Create Account' : 'Login to Career Guidance'}
        </h2>

        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '10px',
            borderRadius: '5px',
            marginBottom: '20px',
            textAlign: 'center',
            border: '1px solid #f5c6cb'
          }}>
            {error}
          </div>
        )}

        {successMessage && (
          <div style={{
            backgroundColor: '#d4edda',
            color: '#155724',
            padding: '15px',
            borderRadius: '5px',
            marginBottom: '20px',
            textAlign: 'center',
            border: '1px solid #c3e6cb',
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px' }}>🎉</span>
              <strong>Registration Successful!</strong>
            </div>
            {successMessage}
            <div style={{ marginTop: '10px', fontSize: '13px', color: '#0f5132' }}>
              <strong>Don't see the email?</strong> Check your spam folder or request a new verification email from your account settings after logging in.
            </div>
            <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#c3e6cb', borderRadius: '4px' }}>
              <strong>Next Step:</strong> Verify your email, then come back here to login.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Role selection - only show during signup */}
          {isSignUp && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                I am a... *
              </label>
              <select
                value={role}
                onChange={(e) => handleRoleChange(e.target.value)}
                style={inputStyle(false)}
                required={isSignUp}
              >
                <option value="student">Student</option>
                <option value="institution">Institution/University</option>
                <option value="company">Company/Employer</option>
                <option value="admin">Administrator</option>
              </select>
              <p style={{ 
                fontSize: '0.8rem', 
                color: '#666', 
                marginTop: '8px',
                padding: '8px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                fontStyle: 'italic'
              }}>
                {getRoleDescription()}
              </p>
            </div>
          )}

          {/* Dynamic form fields based on role */}
          {isSignUp && (
            <>
              {role === 'student' && (
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    style={inputStyle(fieldErrors.name)}
                    placeholder="Enter your full name"
                    maxLength={50}
                  />
                  {renderError('name')}
                </div>
              )}

              {role === 'institution' && (
                <>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Institution Name *
                    </label>
                    <input
                      type="text"
                      value={institutionName}
                      onChange={(e) => handleInstitutionNameChange(e.target.value)}
                      required
                      style={inputStyle(fieldErrors.institutionName)}
                      placeholder="Enter your institution name"
                      maxLength={100}
                    />
                    {renderError('institutionName')}
                  </div>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      style={inputStyle(false)}
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Address
                    </label>
                    <textarea
                      value={address}
                      onChange={(e) => handleAddressChange(e.target.value)}
                      style={inputStyle(false)}
                      placeholder="Enter institution address"
                      rows="3"
                    />
                  </div>
                </>
              )}

              {role === 'company' && (
                <>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => handleCompanyNameChange(e.target.value)}
                      required
                      style={inputStyle(fieldErrors.companyName)}
                      placeholder="Enter your company name"
                      maxLength={100}
                    />
                    {renderError('companyName')}
                  </div>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      style={inputStyle(false)}
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Address
                    </label>
                    <textarea
                      value={address}
                      onChange={(e) => handleAddressChange(e.target.value)}
                      style={inputStyle(false)}
                      placeholder="Enter company address"
                      rows="3"
                    />
                  </div>
                </>
              )}

              {role === 'admin' && (
                <div style={{ 
                  marginBottom: '15px',
                  padding: '10px',
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffeaa7',
                  borderRadius: '5px',
                  fontSize: '14px',
                  color: '#856404'
                }}>
                  <strong>Admin Registration:</strong> Please use an authorized admin email or contact system administrator for access.
                </div>
              )}
            </>
          )}

          {/* Common fields for all roles */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              required
              style={inputStyle(fieldErrors.email)}
              placeholder="Enter your email"
              maxLength={100}
            />
            {renderError('email')}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Password *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              required
              style={inputStyle(fieldErrors.password)}
              placeholder="Enter your password"
              minLength={isSignUp ? 6 : 1}
            />
            {isSignUp && (
              <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>
                Password should be at least 6 characters
              </p>
            )}
            {renderError('password')}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: loading ? '#95a5a6' : '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              transition: 'background-color 0.3s ease'
            }}
          >
            {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Login')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            type="button"
            onClick={handleToggleSignUp}
            style={{
              background: 'none',
              border: 'none',
              color: '#3498db',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '14px'
            }}
          >
            {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign up"}
          </button>
        </div>

        {isSignUp && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#e7f3ff',
            borderRadius: '5px',
            border: '1px solid #b3d9ff',
            fontSize: '13px',
            color: '#0066cc',
            textAlign: 'center'
          }}>
            <strong>Important:</strong> After registration, you will receive a verification email. 
            You must verify your email before you can log in to your account. Your role ({role}) will determine your dashboard features.
          </div>
        )} 
      </div>
    </div>
  );
}

export default Login;