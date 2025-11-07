import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where,
  getDoc
} from 'firebase/firestore';
import './CompanyDashboard.css';

const CompanyDashboard = () => {
  const { user, userData } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [company, setCompany] = useState(null);
  const [showJobForm, setShowJobForm] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && userData?.role === 'company') {
      fetchCompanyData();
    }
  }, [user, userData]);

  const fetchCompanyData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      console.log('🔍 Fetching company data for user:', user.email);
      
      // Try to find company by email (since companies are linked by email)
      const q = query(collection(db, 'companies'), where('email', '==', user.email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Company found
        const companyData = {
          id: querySnapshot.docs[0].id,
          ...querySnapshot.docs[0].data()
        };
        console.log('✅ Company found:', companyData);
        setCompany(companyData);
        
        // Now fetch jobs and applications
        await Promise.all([
          fetchJobs(companyData.id),
          fetchApplications(companyData.id)
        ]);
      } else {
        // No company found
        console.log('❌ No company found for user:', user.email);
        setShowCompanyForm(true);
        setCompany(null);
      }
    } catch (error) {
      console.error('❌ Error fetching company data:', error);
      setCompany(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async (companyId) => {
    const q = query(collection(db, 'jobs'), where('companyId', '==', companyId));
    const querySnapshot = await getDocs(q);
    const jobsList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setJobs(jobsList);
  };

  const fetchApplications = async (companyId) => {
    const q = query(collection(db, 'jobApplications'), where('companyId', '==', companyId));
    const querySnapshot = await getDocs(q);
    const applicationsList = await Promise.all(
      querySnapshot.docs.map(async (docSnap) => {
        const appData = docSnap.data();
        
        // Fetch student details
        const studentDoc = await getDoc(doc(db, 'users', appData.studentId));
        const studentData = studentDoc.exists() ? studentDoc.data() : {};
        
        return {
          id: docSnap.id,
          ...appData,
          student: studentData
        };
      })
    );
    setApplications(applicationsList);
  };

  const createCompany = async (companyData) => {
    try {
      console.log('🏢 Creating new company:', companyData);
      
      const companyDoc = {
        ...companyData,
        email: user.email,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'companies'), companyDoc);
      console.log('✅ Company created with ID:', docRef.id);
      
      const newCompany = {
        id: docRef.id,
        ...companyDoc
      };
      
      setCompany(newCompany);
      setShowCompanyForm(false);
      
      // Now fetch jobs and applications for the new company
      await Promise.all([
        fetchJobs(docRef.id),
        fetchApplications(docRef.id)
      ]);
      
      return true;
    } catch (error) {
      console.error('❌ Error creating company:', error);
      alert('Error creating company. Please try again.');
      return false;
    }
  };

  const updateApplicationStatus = async (applicationId, status) => {
    try {
      await updateDoc(doc(db, 'jobApplications', applicationId), {
        status: status,
        reviewedAt: new Date()
      });
      fetchApplications(company.id);
    } catch (error) {
      console.error('Error updating application:', error);
    }
  };

  const renderTabContent = () => {
    if (!company) {
      return (
        <div className="company-setup">
          <div className="setup-content">
            <h2>Company Setup Required</h2>
            <p>You need to set up your company profile before you can access the dashboard.</p>
            <button 
              className="btn-primary"
              onClick={() => setShowCompanyForm(true)}
            >
              Set Up Company
            </button>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return <CompanyOverview jobs={jobs} applications={applications} company={company} />;
      case 'jobs':
        return <ManageJobs 
          jobs={jobs} 
          onRefresh={() => fetchJobs(company.id)}
          onShowForm={() => setShowJobForm(true)}
        />;
      case 'applications':
        return <ManageApplications applications={applications} onUpdateApplication={updateApplicationStatus} />;
      case 'profile':
        return <CompanyProfile companyData={company} />;
      default:
        return <CompanyOverview jobs={jobs} applications={applications} company={company} />;
    }
  };

  if (loading) {
    return (
      <div className="company-dashboard">
        <div className="loading">
          <div>Loading company data...</div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
            User: {user?.email}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="company-dashboard">
      <div className="dashboard-header">
        <h1>
          {company ? `Welcome, ${company.name}` : 'Company Dashboard'}
        </h1>
        <p>
          {company 
            ? 'Manage your job postings and candidate applications'
            : 'Set up your company to get started'
          }
        </p>
      </div>

      {company && (
        <>
          {/* NAVBAR INSTEAD OF SIDEBAR */}
          <nav className="company-navbar">
            <button 
              className={activeTab === 'overview' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={activeTab === 'jobs' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setActiveTab('jobs')}
            >
              Job Postings
            </button>
            <button 
              className={activeTab === 'applications' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setActiveTab('applications')}
            >
              Applications
            </button>
            <button 
              className={activeTab === 'profile' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setActiveTab('profile')}
            >
              Company Profile
            </button>
          </nav>

          <main className="company-content">
            {renderTabContent()}
          </main>
        </>
      )}

      {!company && !loading && (
        <div className="company-content">
          {renderTabContent()}
        </div>
      )}

      {/* Company Setup Form */}
      {showCompanyForm && (
        <CompanySetupForm 
          onClose={() => setShowCompanyForm(false)}
          onSubmit={createCompany}
          userEmail={user?.email}
          userName={userData?.name}
        />
      )}

      {/* Job Posting Form */}
      {showJobForm && company && (
        <JobPostingForm 
          onClose={() => setShowJobForm(false)}
          onSuccess={() => {
            setShowJobForm(false);
            fetchJobs(company.id);
          }}
          companyId={company.id}
          companyName={company.name}
        />
      )}
    </div>
  );
};

// Company Setup Form Component
const CompanySetupForm = ({ onClose, onSubmit, userEmail, userName }) => {
  const [formData, setFormData] = useState({
    name: userName || '',
    industry: 'technology',
    phone: '',
    address: '',
    website: '',
    size: 'medium',
    description: '',
    foundedYear: new Date().getFullYear()
  });
  const [loading, setLoading] = useState(false);

  const industries = [
    'technology', 'finance', 'healthcare', 'education', 'manufacturing',
    'retail', 'hospitality', 'construction', 'transportation', 'energy',
    'telecommunications', 'agriculture', 'mining', 'entertainment', 'other'
  ];

  const companySizes = [
    { value: 'startup', label: 'Startup (1-10 employees)' },
    { value: 'small', label: 'Small (11-50 employees)' },
    { value: 'medium', label: 'Medium (51-200 employees)' },
    { value: 'large', label: 'Large (201-1000 employees)' },
    { value: 'enterprise', label: 'Enterprise (1000+ employees)' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter company name');
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
          <h3>Set Up Your Company</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Company Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your company name"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Industry *</label>
              <select
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                required
              >
                {industries.map(industry => (
                  <option key={industry} value={industry}>
                    {industry.charAt(0).toUpperCase() + industry.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Company Size</label>
              <select
                name="size"
                value={formData.size}
                onChange={handleChange}
              >
                {companySizes.map(size => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Founded Year</label>
              <input
                type="number"
                name="foundedYear"
                value={formData.foundedYear}
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
              placeholder="Enter company phone number"
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
              placeholder="Enter full company address"
            />
          </div>

          <div className="form-group">
            <label>Company Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              placeholder="Describe your company, mission, services, and culture..."
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Company'}
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

// Sub-components for Company Dashboard (Keep these exactly as before)
const CompanyOverview = ({ jobs, applications, company }) => {
  const stats = {
    totalJobs: jobs.length,
    activeJobs: jobs.filter(job => job.status === 'active').length,
    totalApplications: applications.length,
    pendingApplications: applications.filter(app => app.status === 'pending').length,
    hired: applications.filter(app => app.status === 'hired').length,
  };

  return (
    <div className="company-overview">
      <h2>Company Overview - {company.name}</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Jobs</h3>
          <p className="stat-number">{stats.totalJobs}</p>
          <small>Active: {stats.activeJobs}</small>
        </div>
        
        <div className="stat-card">
          <h3>Total Applications</h3>
          <p className="stat-number">{stats.totalApplications}</p>
          <small>Pending: {stats.pendingApplications}</small>
        </div>
        
        <div className="stat-card">
          <h3>Successful Hires</h3>
          <p className="stat-number">{stats.hired}</p>
          <small>Total hired candidates</small>
        </div>
      </div>

      <div className="recent-jobs">
        <h3>Recent Job Postings</h3>
        <div className="jobs-list">
          {jobs.slice(0, 5).map(job => (
            <div key={job.id} className="job-item">
              <h4>{job.title}</h4>
              <p>{job.department} • {job.type}</p>
              <span className={`status status-${job.status}`}>{job.status}</span>
            </div>
          ))}
          {jobs.length === 0 && (
            <div className="empty-state">No job postings yet</div>
          )}
        </div>
      </div>
    </div>
  );
};

const ManageJobs = ({ jobs, onRefresh, onShowForm }) => {
  return (
    <div className="manage-jobs">
      <div className="section-header">
        <h2>Job Postings</h2>
        <button className="btn-primary" onClick={onShowForm}>
          + Post New Job
        </button>
      </div>

      <div className="jobs-grid">
        {jobs.map(job => (
          <div key={job.id} className="job-card">
            <div className="job-header">
              <h3>{job.title}</h3>
              <span className={`status status-${job.status}`}>{job.status}</span>
            </div>
            <div className="job-details">
              <p><strong>Department:</strong> {job.department}</p>
              <p><strong>Type:</strong> {job.type}</p>
              <p><strong>Location:</strong> {job.location}</p>
              <p><strong>Salary:</strong> {job.salary}</p>
              <p><strong>Posted:</strong> {job.createdAt?.toDate().toLocaleDateString()}</p>
            </div>
            <div className="job-description">
              <p>{job.description}</p>
            </div>
            <div className="job-requirements">
              <h4>Requirements:</h4>
              <p>{job.requirements}</p>
            </div>
          </div>
        ))}
        {jobs.length === 0 && (
          <div className="empty-state">
            <p>No job postings yet. Create your first job posting to get started.</p>
            <button className="btn-primary" onClick={onShowForm}>
              Post Your First Job
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ManageApplications = ({ applications, onUpdateApplication }) => {
  const [filter, setFilter] = useState('all');

  const filteredApplications = applications.filter(app => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  return (
    <div className="manage-applications">
      <div className="section-header">
        <h2>Job Applications</h2>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Applications</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="interview">Interview</option>
          <option value="hired">Hired</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="applications-list">
        {filteredApplications.map(application => (
          <div key={application.id} className="application-card">
            <div className="application-header">
              <h3>{application.student?.name || 'Unknown Student'}</h3>
              <span className={`status status-${application.status}`}>
                {application.status}
              </span>
            </div>
            <div className="application-details">
              <p><strong>Email:</strong> {application.student?.email}</p>
              <p><strong>Applied for:</strong> {application.jobTitle}</p>
              <p><strong>Applied on:</strong> {application.appliedAt?.toDate().toLocaleDateString()}</p>
            </div>
            <div className="application-actions">
              {application.status === 'pending' && (
                <>
                  <button 
                    className="btn-success"
                    onClick={() => onUpdateApplication(application.id, 'reviewed')}
                  >
                    Mark Reviewed
                  </button>
                  <button 
                    className="btn-warning"
                    onClick={() => onUpdateApplication(application.id, 'rejected')}
                  >
                    Reject
                  </button>
                </>
              )}
              {application.status === 'reviewed' && (
                <>
                  <button 
                    className="btn-primary"
                    onClick={() => onUpdateApplication(application.id, 'interview')}
                  >
                    Schedule Interview
                  </button>
                  <button 
                    className="btn-success"
                    onClick={() => onUpdateApplication(application.id, 'hired')}
                  >
                    Hire
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {filteredApplications.length === 0 && (
          <div className="empty-state">No applications found</div>
        )}
      </div>
    </div>
  );
};

const CompanyProfile = ({ companyData }) => {
  return (
    <div className="company-profile">
      <h2>Company Profile</h2>
      <div className="profile-card">
        <div className="profile-info">
          <div className="info-item">
            <strong>Company Name:</strong>
            <span>{companyData?.name || 'Not set'}</span>
          </div>
          <div className="info-item">
            <strong>Email:</strong>
            <span>{companyData?.email}</span>
          </div>
          <div className="info-item">
            <strong>Industry:</strong>
            <span>{companyData?.industry || 'Not specified'}</span>
          </div>
          <div className="info-item">
            <strong>Size:</strong>
            <span>{companyData?.size || 'Not specified'}</span>
          </div>
          <div className="info-item">
            <strong>Location:</strong>
            <span>{companyData?.location || 'Not specified'}</span>
          </div>
          <div className="info-item">
            <strong>Founded:</strong>
            <span>{companyData?.foundedYear || 'Not specified'}</span>
          </div>
          <div className="info-item">
            <strong>Website:</strong>
            <span>{companyData?.website || 'Not specified'}</span>
          </div>
          <div className="info-item">
            <strong>Phone:</strong>
            <span>{companyData?.phone || 'Not specified'}</span>
          </div>
        </div>
        <button className="btn-primary">Edit Profile</button>
      </div>
    </div>
  );
};

const JobPostingForm = ({ onClose, onSuccess, companyId, companyName }) => {
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    type: 'full-time',
    location: '',
    salary: '',
    description: '',
    requirements: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addDoc(collection(db, 'jobs'), {
        ...formData,
        companyId: companyId,
        companyName: companyName,
        status: 'active',
        createdAt: new Date(),
        applications: 0
      });
      onSuccess();
    } catch (error) {
      console.error('Error creating job:', error);
      alert('Error creating job posting');
    } finally {
      setLoading(false);
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
          <h3>Post New Job</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Job Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Department *</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Job Type *</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
              >
                <option value="full-time">Full Time</option>
                <option value="part-time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
            </div>
            <div className="form-group">
              <label>Location *</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Salary *</label>
              <input
                type="text"
                name="salary"
                value={formData.salary}
                onChange={handleChange}
                placeholder="e.g., $50,000 - $70,000"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Job Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              required
            />
          </div>

          <div className="form-group">
            <label>Requirements *</label>
            <textarea
              name="requirements"
              value={formData.requirements}
              onChange={handleChange}
              rows="4"
              placeholder="List the qualifications, skills, and experience required..."
              required
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Posting...' : 'Post Job'}
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

export default CompanyDashboard;