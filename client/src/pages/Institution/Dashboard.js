import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore';
import ManageFaculties from './ManageFaculties';
import ManageCourses from './ManageCourses';
import ViewApplications from './ViewApplications';
import InstitutionProfile from './InstitutionProfile';
import PublishAdmissions from './PublishAdmissions';
import './InstitutionDashboard.css';

const InstitutionDashboard = () => {
  const { currentUser, userData } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [institution, setInstitution] = useState(null);
  const [stats, setStats] = useState({
    totalApplications: 0,
    pendingApplications: 0,
    admittedStudents: 0,
    totalCourses: 0
  });
  const [loading, setLoading] = useState(true);
  const [showInstitutionForm, setShowInstitutionForm] = useState(false);

  useEffect(() => {
    fetchInstitutionData();
  }, [currentUser]);

  useEffect(() => {
    if (institution) {
      fetchStats();
    }
  }, [institution]);

  const fetchInstitutionData = async () => {
    if (!currentUser) return;
    
    try {
      console.log('🔍 Fetching institution data for user:', currentUser.uid);
      
      // First, try to find institution by userId
      const q = query(collection(db, 'institutions'), where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Institution found
        const institutionData = {
          id: querySnapshot.docs[0].id,
          ...querySnapshot.docs[0].data()
        };
        console.log(' Institution found:', institutionData);
        setInstitution(institutionData);
      } else {
        // No institution found - check if we need to create one
        console.log(' No institution found for user');
        
        // Check if user has institution role but no institution record
        if (userData?.role === 'institution') {
          console.log(' User has institution role but no institution record');
          setShowInstitutionForm(true);
        } else {
          console.log(' User does not have institution role');
        }
        
        setInstitution(null);
      }
    } catch (error) {
      console.error(' Error fetching institution data:', error);
      setInstitution(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!institution) return;

    try {
      // Total applications
      const appsQuery = query(
        collection(db, 'applications'), 
        where('institutionId', '==', institution.id)
      );
      const appsSnapshot = await getDocs(appsQuery);
      const totalApplications = appsSnapshot.size;
      
      // Pending applications
      const pendingQuery = query(
        collection(db, 'applications'), 
        where('institutionId', '==', institution.id),
        where('status', '==', 'pending')
      );
      const pendingSnapshot = await getDocs(pendingQuery);
      const pendingApplications = pendingSnapshot.size;

      // Admitted students
      const admittedQuery = query(
        collection(db, 'applications'), 
        where('institutionId', '==', institution.id),
        where('status', '==', 'admitted')
      );
      const admittedSnapshot = await getDocs(admittedQuery);
      const admittedStudents = admittedSnapshot.size;

      // Total courses
      const coursesQuery = query(
        collection(db, 'courses'), 
        where('institutionId', '==', institution.id)
      );
      const coursesSnapshot = await getDocs(coursesQuery);
      const totalCourses = coursesSnapshot.size;

      setStats({
        totalApplications,
        pendingApplications,
        admittedStudents,
        totalCourses
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const createInstitution = async (institutionData) => {
    try {
      console.log('🏫 Creating new institution:', institutionData);
      
      const institutionDoc = {
        ...institutionData,
        userId: currentUser.uid,
        email: currentUser.email,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'institutions'), institutionDoc);
      console.log('Institution created with ID:', docRef.id);
      
      setInstitution({
        id: docRef.id,
        ...institutionDoc
      });
      
      setShowInstitutionForm(false);
      return true;
    } catch (error) {
      console.error(' Error creating institution:', error);
      alert('Error creating institution. Please try again.');
      return false;
    }
  };

  const renderActiveTab = () => {
    if (!institution) {
      return (
        <div className="institution-setup">
          <div className="setup-content">
            <h2>Institution Setup Required</h2>
            <p>You need to set up your institution profile before you can access the dashboard.</p>
            <button 
              className="btn-primary"
              onClick={() => setShowInstitutionForm(true)}
            >
              Set Up Institution
            </button>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'faculties':
        return <ManageFaculties institutionId={institution.id} />;
      case 'courses':
        return <ManageCourses institutionId={institution.id} />;
      case 'applications':
        return <ViewApplications institutionId={institution.id} />;
      case 'admissions':
        return <PublishAdmissions institutionId={institution.id} />;
      case 'profile':
        return <InstitutionProfile institution={institution} onUpdate={fetchInstitutionData} />;
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <div className="dashboard-overview">
      <h2>Institution Overview</h2>
      
      {/* Quick Actions Section Only */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button onClick={() => setActiveTab('faculties')} className="btn-primary">
            Manage Faculties
          </button>
          <button onClick={() => setActiveTab('courses')} className="btn-primary">
            Manage Courses
          </button>
          <button onClick={() => setActiveTab('applications')} className="btn-primary">
            View Applications
          </button>
          <button onClick={() => setActiveTab('admissions')} className="btn-primary">
            Publish Admissions
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="institution-dashboard">
        <div className="loading">
          <div>Loading institution data...</div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
            User: {currentUser?.uid}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="institution-dashboard">
      <div className="dashboard-header">
        <h1>
          {institution ? `Welcome, ${institution.name}` : 'Institution Dashboard'}
        </h1>
        <p>
          {institution 
            ? 'Manage your institution\'s academic programs and student applications'
            : 'Set up your institution to get started'
          }
        </p>
      </div>

      {institution && (
        <>
          {/* NAVBAR INSTEAD OF SIDEBAR */}
          <nav className="institution-navbar">
            <button 
              className={activeTab === 'dashboard' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button 
              className={activeTab === 'faculties' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setActiveTab('faculties')}
            >
              Manage Faculties
            </button>
            <button 
              className={activeTab === 'courses' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setActiveTab('courses')}
            >
              Manage Courses
            </button>
            <button 
              className={activeTab === 'applications' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setActiveTab('applications')}
            >
              View Applications
            </button>
            <button 
              className={activeTab === 'admissions' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setActiveTab('admissions')}
            >
              Publish Admissions
            </button>
            <button 
              className={activeTab === 'profile' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setActiveTab('profile')}
            >
              Institution Profile
            </button>
          </nav>

          <main className="main-content">
            {renderActiveTab()}
          </main>
        </>
      )}

      {!institution && !loading && (
        <div className="main-content">
          {renderActiveTab()}
        </div>
      )}

      {/* Institution Setup Form */}
      {showInstitutionForm && (
        <InstitutionSetupForm 
          onClose={() => setShowInstitutionForm(false)}
          onSubmit={createInstitution}
          userEmail={currentUser?.email}
        />
      )}
    </div>
  );
};

// Institution Setup Form Component
const InstitutionSetupForm = ({ onClose, onSubmit, userEmail }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'university',
    address: '',
    phone: '',
    website: '',
    description: '',
    establishedYear: new Date().getFullYear()
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter institution name');
      return;
    }

    setLoading(true);
    const success = await onSubmit(formData);
    setLoading(false);
    
    if (success) {
      onClose();
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Set Up Your Institution</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Institution Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your institution name"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Institution Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
              >
                <option value="university">University</option>
                <option value="college">College</option>
                <option value="institute">Institute</option>
                <option value="polytechnic">Polytechnic</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Established Year</label>
              <input
                type="number"
                name="establishedYear"
                value={formData.establishedYear}
                onChange={handleChange}
                min="1900"
                max={new Date().getFullYear()}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Contact Email</label>
            <input
              type="email"
              value={userEmail}
              disabled
              className="disabled-input"
            />
            <small>This is your account email</small>
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter institution phone number"
            />
          </div>

          <div className="form-group">
            <label>Website</label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://example.com"
            />
          </div>

          <div className="form-group">
            <label>Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows="3"
              placeholder="Enter full institution address"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              placeholder="Describe your institution, mission, and key features..."
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Institution'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InstitutionDashboard;