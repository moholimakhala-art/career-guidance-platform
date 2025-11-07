import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, addDoc, getDoc, doc } from 'firebase/firestore';
import JobApplicationForm from '../../components/jobs/JobApplicationForm';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const { user, userData } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [applications, setApplications] = useState([]);
  const [courses, setCourses] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [showCourseApplication, setShowCourseApplication] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobApplication, setShowJobApplication] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStudentData();
    }
  }, [user]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchStudentApplications(),
        fetchCourses(),
        fetchInstitutions(),
        fetchJobs()
      ]);
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentApplications = async () => {
    const q = query(collection(db, 'applications'), where('studentId', '==', user.uid));
    const querySnapshot = await getDocs(q);
    const applicationsList = await Promise.all(
      querySnapshot.docs.map(async (docSnap) => {
        const appData = docSnap.data();
        
        // Fetch course and institution details
        const [courseDoc, institutionDoc] = await Promise.all([
          getDoc(doc(db, 'courses', appData.courseId)),
          getDoc(doc(db, 'institutions', appData.institutionId))
        ]);
        
        return {
          id: docSnap.id,
          ...appData,
          course: courseDoc.exists() ? courseDoc.data() : {},
          institution: institutionDoc.exists() ? institutionDoc.data() : {}
        };
      })
    );
    setApplications(applicationsList);
  };

  const fetchCourses = async () => {
    const querySnapshot = await getDocs(collection(db, 'courses'));
    const coursesList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setCourses(coursesList);
  };

  const fetchInstitutions = async () => {
    const querySnapshot = await getDocs(collection(db, 'institutions'));
    const institutionsList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setInstitutions(institutionsList);
  };

  const fetchJobs = async () => {
    const q = query(collection(db, 'jobs'), where('status', '==', 'active'));
    const querySnapshot = await getDocs(q);
    const jobsList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setJobs(jobsList);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <StudentOverview applications={applications} jobs={jobs} />;
      case 'applications':
        return <StudentApplications applications={applications} />;
      case 'courses':
        return <BrowseCourses 
          courses={courses} 
          institutions={institutions}
          onApply={() => setShowCourseApplication(true)}
        />;
      case 'jobs':
        return <BrowseJobs 
          jobs={jobs} 
          onJobApply={(job) => {
            setSelectedJob(job);
            setShowJobApplication(true);
          }}
        />;
      case 'profile':
        return <StudentProfile studentData={userData} />;
      default:
        return <StudentOverview applications={applications} jobs={jobs} />;
    }
  };

  if (loading) {
    return (
      <div className="student-dashboard">
        <div className="loading">Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div className="student-dashboard">
      <div className="dashboard-header">
        <h1>Student Dashboard</h1>
        <p>Welcome back, {userData?.name || user?.email}</p>
        <p>Role: <span className="user-role">{userData?.role}</span></p>
      </div>

      {/* Navbar instead of sidebar */}
      <nav className="student-navbar">
        <ul>
          <li>
            <button 
              className={activeTab === 'overview' ? 'active' : ''}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
          </li>
          <li>
            <button 
              className={activeTab === 'applications' ? 'active' : ''}
              onClick={() => setActiveTab('applications')}
            >
              My Applications
            </button>
          </li>
          <li>
            <button 
              className={activeTab === 'courses' ? 'active' : ''}
              onClick={() => setActiveTab('courses')}
            >
              Browse Courses
            </button>
          </li>
          <li>
            <button 
              className={activeTab === 'jobs' ? 'active' : ''}
              onClick={() => setActiveTab('jobs')}
            >
              Find Jobs
            </button>
          </li>
          <li>
            <button 
              className={activeTab === 'profile' ? 'active' : ''}
              onClick={() => setActiveTab('profile')}
            >
              My Profile
            </button>
          </li>
        </ul>
      </nav>

      <main className="student-content">
        {renderTabContent()}
      </main>

      {showCourseApplication && (
        <CourseApplicationForm 
          onClose={() => setShowCourseApplication(false)}
          onSuccess={() => {
            setShowCourseApplication(false);
            fetchStudentApplications();
          }}
          courses={courses}
          institutions={institutions}
          studentId={user.uid}
        />
      )}

      {showJobApplication && selectedJob && (
        <JobApplicationForm
          job={selectedJob}
          onClose={() => {
            setShowJobApplication(false);
            setSelectedJob(null);
          }}
          onSuccess={(applicationId) => {
            setShowJobApplication(false);
            setSelectedJob(null);
            alert('Application submitted successfully!');
            // Refresh applications list
            fetchStudentData();
          }}
        />
      )}
    </div>
  );
};

// Sub-components for Student Dashboard (all remain exactly the same)
const StudentOverview = ({ applications, jobs }) => {
  const stats = {
    totalApplications: applications.length,
    pendingApplications: applications.filter(app => app.status === 'pending').length,
    admittedApplications: applications.filter(app => app.status === 'admitted').length,
    availableJobs: jobs.length,
  };

  return (
    <div className="student-overview">
      <h2>Student Overview</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Applications</h3>
          <p className="stat-number">{stats.totalApplications}</p>
          <small>All course applications</small>
        </div>
        
        <div className="stat-card">
          <h3>Pending</h3>
          <p className="stat-number">{stats.pendingApplications}</p>
          <small>Under review</small>
        </div>
        
        <div className="stat-card">
          <h3>Admitted</h3>
          <p className="stat-number">{stats.admittedApplications}</p>
          <small>Accepted offers</small>
        </div>
        
        <div className="stat-card">
          <h3>Available Jobs</h3>
          <p className="stat-number">{stats.availableJobs}</p>
          <small>Job opportunities</small>
        </div>
      </div>

      <div className="recent-applications">
        <h3>Recent Applications</h3>
        <div className="applications-preview">
          {applications.slice(0, 3).map(application => (
            <div key={application.id} className="application-preview">
              <h4>{application.course?.name || 'Unknown Course'}</h4>
              <p>{application.institution?.name || 'Unknown Institution'}</p>
              <span className={`status status-${application.status}`}>
                {application.status}
              </span>
            </div>
          ))}
          {applications.length === 0 && (
            <div className="empty-state">No applications yet</div>
          )}
        </div>
      </div>
    </div>
  );
};

const StudentApplications = ({ applications }) => {
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString();
      }
      return new Date(timestamp).toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  return (
    <div className="student-applications">
      <h2>My Course Applications</h2>
      
      <div className="applications-list">
        {applications.map(application => (
          <div key={application.id} className="application-card">
            <div className="application-header">
              <div>
                <h3>{application.course?.name || 'Unknown Course'}</h3>
                <p>{application.institution?.name || 'Unknown Institution'}</p>
              </div>
              <span className={`status status-${application.status}`}>
                {application.status}
              </span>
            </div>
            
            <div className="application-details">
              <div className="detail-item">
                <strong>Course Duration:</strong>
                <span>{application.course?.duration || 'N/A'} years</span>
              </div>
              <div className="detail-item">
                <strong>Faculty:</strong>
                <span>{application.course?.facultyName || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <strong>Applied Date:</strong>
                <span>{formatDate(application.appliedAt)}</span>
              </div>
              {application.reviewedAt && (
                <div className="detail-item">
                  <strong>Reviewed Date:</strong>
                  <span>{formatDate(application.reviewedAt)}</span>
                </div>
              )}
            </div>
            
            {application.status === 'admitted' && (
              <div className="admission-offer">
                <p>🎉 Congratulations! You have been admitted to this program.</p>
                <button className="btn-success">Accept Offer</button>
              </div>
            )}
          </div>
        ))}
        
        {applications.length === 0 && (
          <div className="empty-state">
            <p>You haven't submitted any course applications yet.</p>
            <p>Browse courses and apply to get started with your academic journey!</p>
          </div>
        )}
      </div>
    </div>
  );
};

const BrowseCourses = ({ courses, institutions, onApply }) => {
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');

  const filteredCourses = courses.filter(course => {
    if (selectedInstitution && course.institutionId !== selectedInstitution) return false;
    if (selectedFaculty && course.facultyName !== selectedFaculty) return false;
    return true;
  });

  const faculties = [...new Set(courses.map(course => course.facultyName).filter(Boolean))];

  return (
    <div className="browse-courses">
      <div className="section-header">
        <h2>Browse Courses</h2>
        <button className="btn-primary" onClick={onApply}>
          Apply for Courses
        </button>
      </div>

      <div className="filters">
        <div className="filter-group">
          <label>Filter by Institution:</label>
          <select 
            value={selectedInstitution} 
            onChange={(e) => setSelectedInstitution(e.target.value)}
          >
            <option value="">All Institutions</option>
            {institutions.map(inst => (
              <option key={inst.id} value={inst.id}>{inst.name}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label>Filter by Faculty:</label>
          <select 
            value={selectedFaculty} 
            onChange={(e) => setSelectedFaculty(e.target.value)}
          >
            <option value="">All Faculties</option>
            {faculties.map(faculty => (
              <option key={faculty} value={faculty}>{faculty}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="courses-grid">
        {filteredCourses.map(course => {
          const institution = institutions.find(inst => inst.id === course.institutionId);
          return (
            <div key={course.id} className="course-card">
              <div className="course-header">
                <h3>{course.name}</h3>
                <span className="course-code">{course.code}</span>
              </div>
              
              <div className="course-details">
                <p><strong>Institution:</strong> {institution?.name || 'Unknown'}</p>
                <p><strong>Faculty:</strong> {course.facultyName}</p>
                <p><strong>Duration:</strong> {course.duration} years</p>
                <p><strong>Fees:</strong> M{course.fees || 'N/A'}</p>
                <p><strong>Capacity:</strong> {course.capacity} students</p>
              </div>
              
              <div className="course-description">
                <p>{course.description || 'No description available.'}</p>
              </div>
              
              <div className="course-requirements">
                <h4>Requirements:</h4>
                <p>{course.requirements || 'No specific requirements listed.'}</p>
              </div>
              
              <button className="btn-primary" onClick={onApply}>
                Apply for this Course
              </button>
            </div>
          );
        })}
        
        {filteredCourses.length === 0 && (
          <div className="empty-state">
            <p>No courses found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const BrowseJobs = ({ jobs, onJobApply }) => {
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString();
      }
      return new Date(timestamp).toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  return (
    <div className="browse-jobs">
      <h2>Available Job Opportunities</h2>
      
      <div className="jobs-grid">
        {jobs.map(job => (
          <div key={job.id} className="job-card">
            <div className="job-header">
              <h3>{job.title}</h3>
              <span className="job-type">{job.type}</span>
            </div>
            
            <div className="job-details">
              <p><strong>Company:</strong> {job.companyName}</p>
              <p><strong>Department:</strong> {job.department}</p>
              <p><strong>Location:</strong> {job.location}</p>
              <p><strong>Salary:</strong> {job.salary}</p>
              <p><strong>Posted:</strong> {formatDate(job.createdAt)}</p>
            </div>
            
            <div className="job-description">
              <p>{job.description}</p>
            </div>
            
            <div className="job-requirements">
              <h4>Requirements:</h4>
              <p>{job.requirements}</p>
            </div>
            
            <div className="job-actions">
              <button 
                className="btn-primary" 
                onClick={() => onJobApply(job)}
              >
                Apply Now
              </button>
              <button className="btn-secondary">Save for Later</button>
            </div>
          </div>
        ))}
        
        {jobs.length === 0 && (
          <div className="empty-state">
            <p>No job opportunities available at the moment.</p>
            <p>Check back later for new job postings.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const StudentProfile = ({ studentData }) => {
  return (
    <div className="student-profile">
      <h2>My Profile</h2>
      
      <div className="profile-card">
        <div className="profile-section">
          <h3>Personal Information</h3>
          <div className="profile-info">
            <div className="info-item">
              <strong>Full Name:</strong>
              <span>{studentData?.name || 'Not set'}</span>
            </div>
            <div className="info-item">
              <strong>Email:</strong>
              <span>{studentData?.email}</span>
            </div>
            <div className="info-item">
              <strong>Phone:</strong>
              <span>{studentData?.phone || 'Not provided'}</span>
            </div>
            <div className="info-item">
              <strong>Student ID:</strong>
              <span>{studentData?.uid || 'Not assigned'}</span>
            </div>
          </div>
        </div>
        
        <div className="profile-section">
          <h3>Academic Information</h3>
          <div className="profile-info">
            <div className="info-item">
              <strong>High School:</strong>
              <span>{studentData?.highSchool || 'Not specified'}</span>
            </div>
            <div className="info-item">
              <strong>Graduation Year:</strong>
              <span>{studentData?.graduationYear || 'Not specified'}</span>
            </div>
          </div>
        </div>
        
        <div className="profile-actions">
          <button className="btn-primary">Edit Profile</button>
          <button className="btn-secondary">Upload Documents</button>
        </div>
      </div>
    </div>
  );
};

const CourseApplicationForm = ({ onClose, onSuccess, courses, institutions, studentId }) => {
  const [formData, setFormData] = useState({
    institutionId: '',
    courseId: '',
    message: ''
  });
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Update available courses when institution changes
  useEffect(() => {
    if (formData.institutionId) {
      const institutionCourses = courses.filter(course => course.institutionId === formData.institutionId);
      setAvailableCourses(institutionCourses);
      // Reset course selection when institution changes
      setFormData(prev => ({ ...prev, courseId: '' }));
    } else {
      setAvailableCourses([]);
    }
  }, [formData.institutionId, courses]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.institutionId || !formData.courseId) {
      alert('Please select both institution and course');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'applications'), {
        studentId: studentId,
        institutionId: formData.institutionId,
        courseId: formData.courseId,
        status: 'pending',
        appliedAt: new Date(),
        message: formData.message
      });
      onSuccess();
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('Error submitting application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Apply for Course</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Select Institution *</label>
            <select
              value={formData.institutionId}
              onChange={(e) => setFormData({...formData, institutionId: e.target.value})}
              required
            >
              <option value="">Choose an institution</option>
              {institutions.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Select Course *</label>
            <select
              value={formData.courseId}
              onChange={(e) => setFormData({...formData, courseId: e.target.value})}
              required
              disabled={!formData.institutionId}
            >
              <option value="">{formData.institutionId ? 'Choose a course' : 'Select institution first'}</option>
              {availableCourses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.name} - {course.facultyName}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Additional Message (Optional)</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({...formData, message: e.target.value})}
              rows="4"
              placeholder="Any additional information you'd like to include with your application..."
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Application'}
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

export default StudentDashboard;