import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../services/firebase';
import { 
  collection, query, where, getDocs, addDoc, getDoc, doc, updateDoc,
  setDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import JobApplicationForm from '../../components/jobs/JobApplicationForm';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const { user, userData } = useAuth();
  const [activeTab, setActiveTab] = useState('courses');
  const [applications, setApplications] = useState([]);
  const [courses, setCourses] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [showCourseApplication, setShowCourseApplication] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobApplication, setShowJobApplication] = useState(false);
  const [loading, setLoading] = useState(true);
  const [eligibleCourses, setEligibleCourses] = useState([]);

  useEffect(() => {
    if (user) {
      fetchStudentData();
    }
  }, [user]);

  useEffect(() => {
    if (courses.length > 0 && userData) {
      filterEligibleCourses();
    }
  }, [courses, userData]);

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

  const filterEligibleCourses = () => {
    if (!userData || !userData.academicResults) {
      setEligibleCourses(courses);
      return;
    }

    const filtered = courses.filter(course => {
      const studentResults = userData.academicResults || {};
      
      if (course.requirements) {
        return true;
      }
      
      return true;
    });

    setEligibleCourses(filtered);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'courses':
        return <BrowseCourses 
          courses={eligibleCourses}
          institutions={institutions}
          onApply={() => setShowCourseApplication(true)}
          hasAcademicResults={!!userData?.academicResults}
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
        return <StudentProfile 
          studentData={userData} 
          onProfileUpdate={fetchStudentData}
        />;
      case 'documents':
        return <StudentDocuments 
          studentData={userData}
          studentId={user.uid}
          onDocumentsUpdate={fetchStudentData}
        />;
      default:
        return <BrowseCourses 
          courses={eligibleCourses}
          institutions={institutions}
          onApply={() => setShowCourseApplication(true)}
          hasAcademicResults={!!userData?.academicResults}
        />;
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
        <p>Discover courses and opportunities that match your profile</p>
      </div>

      <nav className="student-navbar">
        <ul>
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
              My Profile & Results
            </button>
          </li>
          <li>
            <button 
              className={activeTab === 'documents' ? 'active' : ''}
              onClick={() => setActiveTab('documents')}
            >
              My Documents
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
          onSuccess={() => {
            setShowJobApplication(false);
            setSelectedJob(null);
            alert('Application submitted successfully!');
            fetchStudentData();
          }}
          studentId={user.uid}
          studentData={userData}
        />
      )}
    </div>
  );
};

const BrowseCourses = ({ courses, institutions, onApply, hasAcademicResults }) => {
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
        <h2>Available Courses</h2>
        <div className="header-info">
          <p>Showing courses that match your academic profile</p>
          {!hasAcademicResults && (
            <div className="warning-banner">
              <span>⚠</span>
              <span>Add your academic results to your profile to see personalized course recommendations</span>
            </div>
          )}
        </div>
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

      <div className="courses-stats">
        <div className="stat-item">
          <strong>{filteredCourses.length}</strong> courses available
        </div>
        <div className="stat-item">
          <strong>{institutions.length}</strong> institutions
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
              
              <div className="course-eligibility">
                <h4>Eligibility:</h4>
                <p>{course.requirements || 'Check institution requirements'}</p>
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
            <p>Try adjusting your filters or check back later for new courses.</p>
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

const StudentProfile = ({ studentData, onProfileUpdate }) => {
  const { updateUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    highSchool: '',
    graduationYear: '',
    address: '',
    dateOfBirth: '',
    academicResults: {}
  });
  const [loading, setLoading] = useState(false);
  const [academicResults, setAcademicResults] = useState({
    mathematics: '',
    english: '',
    science: '',
    socialStudies: '',
    additionalSubjects: {}
  });

  useEffect(() => {
    if (studentData) {
      setFormData({
        name: studentData.name || '',
        phone: studentData.phone || '',
        highSchool: studentData.highSchool || '',
        graduationYear: studentData.graduationYear || '',
        address: studentData.address || '',
        dateOfBirth: studentData.dateOfBirth || '',
        academicResults: studentData.academicResults || {}
      });
      
      const results = studentData.academicResults || {};
      setAcademicResults({
        mathematics: results.mathematics || '',
        english: results.english || '',
        science: results.science || '',
        socialStudies: results.socialStudies || '',
        additionalSubjects: results.additionalSubjects || {}
      });
    }
  }, [studentData]);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAcademicResultsChange = (subject, value) => {
    setAcademicResults(prev => ({
      ...prev,
      [subject]: value
    }));
  };

  const handleAdditionalSubjectChange = (subject, value) => {
    setAcademicResults(prev => ({
      ...prev,
      additionalSubjects: {
        ...prev.additionalSubjects,
        [subject]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cleanedAcademicResults = {
        mathematics: academicResults.mathematics?.toString() || '',
        english: academicResults.english?.toString() || '',
        science: academicResults.science?.toString() || '',
        socialStudies: academicResults.socialStudies?.toString() || '',
        additionalSubjects: academicResults.additionalSubjects || {}
      };

      Object.keys(cleanedAcademicResults.additionalSubjects).forEach(key => {
        if (!cleanedAcademicResults.additionalSubjects[key]) {
          delete cleanedAcademicResults.additionalSubjects[key];
        }
      });

      const updatedData = {
        ...formData,
        academicResults: cleanedAcademicResults,
        updatedAt: new Date()
      };

      const userDocRef = doc(db, 'users', studentData.uid);
      await updateDoc(userDocRef, updatedData);

      if (updateUserProfile) {
        await updateUserProfile(updatedData);
      }

      setIsEditing(false);
      alert('Profile updated successfully! Your course recommendations will update automatically.');
      
      if (onProfileUpdate) {
        onProfileUpdate();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: studentData.name || '',
      phone: studentData.phone || '',
      highSchool: studentData.highSchool || '',
      graduationYear: studentData.graduationYear || '',
      address: studentData.address || '',
      dateOfBirth: studentData.dateOfBirth || '',
      academicResults: studentData.academicResults || {}
    });
    setAcademicResults(studentData.academicResults || {
      mathematics: '',
      english: '',
      science: '',
      socialStudies: '',
      additionalSubjects: {}
    });
    setIsEditing(false);
  };

  const renderAcademicResults = () => {
    if (!studentData?.academicResults) {
      return (
        <div className="empty-state">
          <p>No academic results added yet.</p>
          <p>Add your results to get personalized course recommendations.</p>
        </div>
      );
    }

    const results = studentData.academicResults;
    const mainSubjects = ['mathematics', 'english', 'science', 'socialStudies'];
    
    return (
      <div className="academic-results-display">
        <div className="results-grid">
          {mainSubjects.map(subject => {
            const grade = results[subject];
            if (!grade) return null;
            
            return (
              <div key={subject} className="result-item">
                <strong>{subject.charAt(0).toUpperCase() + subject.slice(1)}:</strong>
                <span>{grade.toString()}</span>
              </div>
            );
          })}
          
          {results.additionalSubjects && typeof results.additionalSubjects === 'object' && 
           Object.keys(results.additionalSubjects).length > 0 && (
            <>
              {Object.entries(results.additionalSubjects).map(([subject, grade]) => (
                <div key={subject} className="result-item">
                  <strong>{subject}:</strong>
                  <span>{grade?.toString() || ''}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="student-profile">
      <div className="section-header">
        <h2>My Profile & Academic Results</h2>
        <button 
          className={isEditing ? 'btn-secondary' : 'btn-primary'} 
          onClick={isEditing ? handleCancel : handleEditToggle}
        >
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>
      
      <div className="profile-card">
        {isEditing ? (
          <form onSubmit={handleSubmit}>
            <div className="profile-section">
              <h3>Personal Information</h3>
              <div className="profile-info">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={studentData?.email || ''}
                    disabled
                    className="form-input disabled"
                  />
                  <small>Email cannot be changed</small>
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="+266 XXX XXX"
                  />
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="form-input"
                    rows="3"
                    placeholder="Enter your current address"
                  />
                </div>
              </div>
            </div>
            
            <div className="profile-section">
              <h3>Academic Information</h3>
              <div className="profile-info">
                <div className="form-group">
                  <label>High School</label>
                  <input
                    type="text"
                    name="highSchool"
                    value={formData.highSchool}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Name of your high school"
                  />
                </div>
                <div className="form-group">
                  <label>Graduation Year</label>
                  <input
                    type="number"
                    name="graduationYear"
                    value={formData.graduationYear}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="YYYY"
                    min="1900"
                    max="2030"
                  />
                </div>
              </div>
            </div>

            <div className="profile-section">
              <h3>Academic Results (for Course Eligibility)</h3>
              <div className="academic-results">
                <div className="results-grid">
                  <div className="form-group">
                    <label>Mathematics</label>
                    <input
                      type="text"
                      value={academicResults.mathematics || ''}
                      onChange={(e) => handleAcademicResultsChange('mathematics', e.target.value)}
                      className="form-input"
                      placeholder="Grade/Score"
                    />
                  </div>
                  <div className="form-group">
                    <label>English</label>
                    <input
                      type="text"
                      value={academicResults.english || ''}
                      onChange={(e) => handleAcademicResultsChange('english', e.target.value)}
                      className="form-input"
                      placeholder="Grade/Score"
                    />
                  </div>
                  <div className="form-group">
                    <label>Science</label>
                    <input
                      type="text"
                      value={academicResults.science || ''}
                      onChange={(e) => handleAcademicResultsChange('science', e.target.value)}
                      className="form-input"
                      placeholder="Grade/Score"
                    />
                  </div>
                  <div className="form-group">
                    <label>Social Studies</label>
                    <input
                      type="text"
                      value={academicResults.socialStudies || ''}
                      onChange={(e) => handleAcademicResultsChange('socialStudies', e.target.value)}
                      className="form-input"
                      placeholder="Grade/Score"
                    />
                  </div>
                </div>
                <div className="additional-subjects">
                  <h4>Additional Subjects</h4>
                  {Object.entries(academicResults.additionalSubjects || {}).map(([subject, grade]) => (
                    <div key={subject} className="form-group">
                      <label>{subject}</label>
                      <input
                        type="text"
                        value={grade || ''}
                        onChange={(e) => handleAdditionalSubjectChange(subject, e.target.value)}
                        className="form-input"
                        placeholder="Grade/Score"
                      />
                    </div>
                  ))}
                  <button 
                    type="button" 
                    className="btn-secondary btn-sm"
                    onClick={() => {
                      const subject = prompt('Enter subject name:');
                      if (subject) {
                        handleAdditionalSubjectChange(subject, '');
                      }
                    }}
                  >
                    + Add Subject
                  </button>
                </div>
              </div>
            </div>
            
            <div className="profile-actions">
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
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
                  <strong>Date of Birth:</strong>
                  <span>{studentData?.dateOfBirth || 'Not provided'}</span>
                </div>
                <div className="info-item">
                  <strong>Address:</strong>
                  <span>{studentData?.address || 'Not provided'}</span>
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

            <div className="profile-section">
              <h3>Academic Results</h3>
              {renderAcademicResults()}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const StudentDocuments = ({ studentData, studentId, onDocumentsUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState({
    cv: null,
    transcript: null,
    otherDocuments: []
  });

  useEffect(() => {
    if (studentData?.documents) {
      setDocuments(studentData.documents);
    }
  }, [studentData]);

  const handleFileUpload = async (fileType, file) => {
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      alert('Please upload only PDF files');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    
    try {
      const fileName = `${fileType}_${studentId}_${Date.now()}.pdf`;
      const storageRef = ref(storage, `students/${studentId}/${fileName}`);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      const userDocRef = doc(db, 'users', studentId);
      const updatedDocuments = {
        ...documents,
        [fileType]: {
          fileName: fileName,
          originalName: file.name,
          url: downloadURL,
          uploadedAt: new Date(),
          size: file.size
        }
      };
      
      await updateDoc(userDocRef, {
        documents: updatedDocuments,
        updatedAt: new Date()
      });
      
      setDocuments(updatedDocuments);
      alert(`${fileType.toUpperCase()} uploaded successfully!`);
      
      if (onDocumentsUpdate) {
        onDocumentsUpdate();
      }
      
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (fileType) => {
    if (!documents[fileType]) return;
    
    if (!window.confirm(`Are you sure you want to delete your ${fileType.toUpperCase()}?`)) {
      return;
    }
    
    try {
      const storageRef = ref(storage, `students/${studentId}/${documents[fileType].fileName}`);
      await deleteObject(storageRef);
      
      const userDocRef = doc(db, 'users', studentId);
      const updatedDocuments = {
        ...documents,
        [fileType]: null
      };
      
      await updateDoc(userDocRef, {
        documents: updatedDocuments,
        updatedAt: new Date()
      });
      
      setDocuments(updatedDocuments);
      alert(`${fileType.toUpperCase()} deleted successfully!`);
      
      if (onDocumentsUpdate) {
        onDocumentsUpdate();
      }
      
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Error deleting file. Please try again.');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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
    <div className="student-documents">
      <div className="section-header">
        <h2>My Documents</h2>
        <p>Upload your CV and academic transcripts for job and course applications</p>
      </div>

      <div className="documents-grid">
        <div className="document-card">
          <div className="document-header">
            <h3>📄 Curriculum Vitae (CV)</h3>
            <span className={`status ${documents.cv ? 'uploaded' : 'missing'}`}>
              {documents.cv ? 'Uploaded' : 'Not Uploaded'}
            </span>
          </div>
          
          <div className="document-info">
            {documents.cv ? (
              <div className="file-info">
                <p><strong>File:</strong> {documents.cv.originalName}</p>
                <p><strong>Size:</strong> {formatFileSize(documents.cv.size)}</p>
                <p><strong>Uploaded:</strong> {formatDate(documents.cv.uploadedAt)}</p>
                <div className="document-actions">
                  <a 
                    href={documents.cv.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn-primary btn-sm"
                  >
                    View PDF
                  </a>
                  <button 
                    onClick={() => handleDeleteDocument('cv')}
                    className="btn-secondary btn-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="upload-area">
                <p>No CV uploaded yet</p>
                <p className="file-requirements">PDF only, max 5MB</p>
              </div>
            )}
          </div>
          
          <div className="upload-section">
            <input
              type="file"
              id="cv-upload"
              accept=".pdf"
              onChange={(e) => handleFileUpload('cv', e.target.files[0])}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            <label 
              htmlFor="cv-upload" 
              className={`upload-btn ${uploading ? 'disabled' : ''}`}
            >
              {uploading ? 'Uploading...' : (documents.cv ? 'Update CV' : 'Upload CV')}
            </label>
          </div>
        </div>

        <div className="document-card">
          <div className="document-header">
            <h3>🎓 Academic Transcript</h3>
            <span className={`status ${documents.transcript ? 'uploaded' : 'missing'}`}>
              {documents.transcript ? 'Uploaded' : 'Not Uploaded'}
            </span>
          </div>
          
          <div className="document-info">
            {documents.transcript ? (
              <div className="file-info">
                <p><strong>File:</strong> {documents.transcript.originalName}</p>
                <p><strong>Size:</strong> {formatFileSize(documents.transcript.size)}</p>
                <p><strong>Uploaded:</strong> {formatDate(documents.transcript.uploadedAt)}</p>
                <div className="document-actions">
                  <a 
                    href={documents.transcript.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn-primary btn-sm"
                  >
                    View PDF
                  </a>
                  <button 
                    onClick={() => handleDeleteDocument('transcript')}
                    className="btn-secondary btn-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="upload-area">
                <p>No transcript uploaded yet</p>
                <p className="file-requirements">PDF only, max 5MB</p>
              </div>
            )}
          </div>
          
          <div className="upload-section">
            <input
              type="file"
              id="transcript-upload"
              accept=".pdf"
              onChange={(e) => handleFileUpload('transcript', e.target.files[0])}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            <label 
              htmlFor="transcript-upload" 
              className={`upload-btn ${uploading ? 'disabled' : ''}`}
            >
              {uploading ? 'Uploading...' : (documents.transcript ? 'Update Transcript' : 'Upload Transcript')}
            </label>
          </div>
        </div>
      </div>

      <div className="additional-documents">
        <h3>Additional Documents</h3>
        <div className="document-card">
          <div className="document-info">
            <p>You can upload additional supporting documents like certificates, recommendation letters, or portfolio samples.</p>
            <p className="file-requirements">PDF only, max 5MB per file</p>
          </div>
          <div className="upload-section">
            <input
              type="file"
              id="additional-upload"
              accept=".pdf"
              onChange={(e) => handleFileUpload('other', e.target.files[0])}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            <label 
              htmlFor="additional-upload" 
              className={`upload-btn ${uploading ? 'disabled' : ''}`}
            >
              {uploading ? 'Uploading...' : 'Upload Additional Document'}
            </label>
          </div>
        </div>
      </div>

      <div className="upload-instructions">
        <h4>📋 Upload Guidelines:</h4>
        <ul>
          <li>Only PDF files are accepted</li>
          <li>Maximum file size: 5MB per document</li>
          <li>Name your files clearly (e.g., "John_Doe_CV.pdf")</li>
          <li>Ensure documents are readable and up-to-date</li>
          <li>Your CV and transcript will be automatically attached to job applications</li>
        </ul>
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

  useEffect(() => {
    if (formData.institutionId) {
      const institutionCourses = courses.filter(course => course.institutionId === formData.institutionId);
      setAvailableCourses(institutionCourses);
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