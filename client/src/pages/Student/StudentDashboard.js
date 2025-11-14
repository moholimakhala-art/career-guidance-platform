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
  const [selectedCourseForApplication, setSelectedCourseForApplication] = useState(null);

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

  const calculateGPA = (academicResults) => {
    if (!academicResults) return 0;

    const gradePoints = {
      'A+': 4.3, 'A': 4.0, 'A-': 3.7, 
      'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7,
      'D+': 1.3, 'D': 1.0, 'F': 0.0,
      'a+': 4.3, 'a': 4.0, 'a-': 3.7,
      'b+': 3.3, 'b': 3.0, 'b-': 2.7,
      'c+': 2.3, 'c': 2.0, 'c-': 1.7,
      'd+': 1.3, 'd': 1.0, 'f': 0.0
    };

    const numericalRanges = {
      '95-100': 4.3, '90-94': 4.0, '85-89': 3.7,
      '80-84': 3.3, '75-79': 3.0, '70-74': 2.7,
      '65-69': 2.3, '60-64': 2.0, '55-59': 1.7,
      '50-54': 1.3, '45-49': 1.0, '0-44': 0.0
    };

    let totalPoints = 0;
    let subjectCount = 0;

    // Process main subjects
    const mainSubjects = ['mathematics', 'english', 'science', 'socialStudies'];
    mainSubjects.forEach(subject => {
      const grade = academicResults[subject];
      if (grade && grade.toString().trim() !== '') {
        let points = 0;
        const gradeStr = grade.toString().trim();
        
        // Check if grade is in letter format
        if (gradePoints[gradeStr] !== undefined) {
          points = gradePoints[gradeStr];
        }
        // Check if grade is in percentage range format
        else if (numericalRanges[gradeStr] !== undefined) {
          points = numericalRanges[gradeStr];
        }
        // Check if grade is a numerical value
        else {
          const numericGrade = parseFloat(gradeStr);
          if (!isNaN(numericGrade)) {
            if (numericGrade >= 95) points = 4.3;
            else if (numericGrade >= 90) points = 4.0;
            else if (numericGrade >= 85) points = 3.7;
            else if (numericGrade >= 80) points = 3.3;
            else if (numericGrade >= 75) points = 3.0;
            else if (numericGrade >= 70) points = 2.7;
            else if (numericGrade >= 65) points = 2.3;
            else if (numericGrade >= 60) points = 2.0;
            else if (numericGrade >= 55) points = 1.7;
            else if (numericGrade >= 50) points = 1.3;
            else if (numericGrade >= 45) points = 1.0;
            else points = 0.0;
          }
        }
        
        if (points > 0) {
          totalPoints += points;
          subjectCount++;
        }
      }
    });

    // Process additional subjects
    if (academicResults.additionalSubjects) {
      Object.values(academicResults.additionalSubjects).forEach(grade => {
        if (grade && grade.toString().trim() !== '') {
          let points = 0;
          const gradeStr = grade.toString().trim();
          
          if (gradePoints[gradeStr] !== undefined) {
            points = gradePoints[gradeStr];
          }
          else if (numericalRanges[gradeStr] !== undefined) {
            points = numericalRanges[gradeStr];
          }
          else {
            const numericGrade = parseFloat(gradeStr);
            if (!isNaN(numericGrade)) {
              if (numericGrade >= 95) points = 4.3;
              else if (numericGrade >= 90) points = 4.0;
              else if (numericGrade >= 85) points = 3.7;
              else if (numericGrade >= 80) points = 3.3;
              else if (numericGrade >= 75) points = 3.0;
              else if (numericGrade >= 70) points = 2.7;
              else if (numericGrade >= 65) points = 2.3;
              else if (numericGrade >= 60) points = 2.0;
              else if (numericGrade >= 55) points = 1.7;
              else if (numericGrade >= 50) points = 1.3;
              else if (numericGrade >= 45) points = 1.0;
              else points = 0.0;
            }
          }
          
          if (points > 0) {
            totalPoints += points;
            subjectCount++;
          }
        }
      });
    }

    const gpa = subjectCount > 0 ? parseFloat((totalPoints / subjectCount).toFixed(2)) : 0;
    return gpa > 4.3 ? 4.3 : gpa; // Cap at 4.3 for A+
  };

  const filterEligibleCourses = () => {
    if (!userData || !userData.academicResults || Object.keys(userData.academicResults).length === 0) {
      // If no academic results, show all courses but without apply functionality
      setEligibleCourses(courses.map(course => ({ 
        ...course, 
        canApply: false,
        eligibilityReason: 'Complete your academic profile to see eligibility',
        studentGPA: 0
      })));
      return;
    }

    const studentGPA = calculateGPA(userData.academicResults);
    const studentResults = userData.academicResults;

    const filtered = courses.map(course => {
      const eligibility = checkEligibility(course, studentResults, studentGPA);
      
      return {
        ...course,
        canApply: eligibility.isEligible,
        eligibilityReason: eligibility.reason,
        requiredGPA: course.requirements?.minimumGPA,
        studentGPA: studentGPA,
        missingRequirements: eligibility.missingRequirements
      };
    });

    setEligibleCourses(filtered);
  };

  const checkEligibility = (course, studentResults, studentGPA) => {
    if (!course.requirements) {
      return { 
        isEligible: true, 
        reason: 'No specific requirements',
        missingRequirements: []
      };
    }

    const requirements = course.requirements;
    const missingRequirements = [];

    // Check GPA requirement
    if (requirements.minimumGPA) {
      const minGPA = parseFloat(requirements.minimumGPA);
      const studentGPAFloat = parseFloat(studentGPA);
      
      if (studentGPAFloat < minGPA) {
        missingRequirements.push({
          type: 'gpa',
          message: `Minimum GPA required: ${minGPA} (Your GPA: ${studentGPA})`
        });
      }
    }

    // Check subject requirements
    if (requirements.requiredSubjects && Array.isArray(requirements.requiredSubjects)) {
      requirements.requiredSubjects.forEach(subjectReq => {
        const subjectName = subjectReq.subject.toLowerCase();
        const minGrade = subjectReq.minGrade;
        
        let studentGrade = studentResults[subjectName] || 
                          studentResults.additionalSubjects?.[subjectName];
        
        if (!studentGrade || studentGrade.toString().trim() === '') {
          missingRequirements.push({
            type: 'subject',
            message: `Missing required subject: ${subjectReq.subject}`
          });
        } else {
          // Convert both grades to comparable format and check
          if (!isGradeSufficient(studentGrade, minGrade)) {
            missingRequirements.push({
              type: 'grade',
              message: `Insufficient grade in ${subjectReq.subject}: Required ${minGrade}, You have ${studentGrade}`
            });
          }
        }
      });
    }

    // Check specific grade requirements for common subjects
    const commonSubjects = {
      mathematics: requirements.minimumMathGrade,
      english: requirements.minimumEnglishGrade,
      science: requirements.minimumScienceGrade
    };

    Object.entries(commonSubjects).forEach(([subject, minGrade]) => {
      if (minGrade) {
        const studentGrade = studentResults[subject];
        if (!studentGrade || studentGrade.toString().trim() === '') {
          missingRequirements.push({
            type: 'subject',
            message: `Missing ${subject} grade`
          });
        } else if (!isGradeSufficient(studentGrade, minGrade)) {
          missingRequirements.push({
            type: 'grade',
            message: `Insufficient ${subject} grade: Required ${minGrade}, You have ${studentGrade}`
          });
        }
      }
    });

    return {
      isEligible: missingRequirements.length === 0,
      reason: missingRequirements.length > 0 
        ? missingRequirements.map(req => req.message).join('; ') 
        : 'Meets all requirements',
      missingRequirements: missingRequirements
    };
  };

  const isGradeSufficient = (studentGrade, requiredGrade) => {
    if (!studentGrade || !requiredGrade) return false;

    // Grade points mapping (extended to support A+ and higher GPAs)
    const gradePoints = {
      'A+': 4.3, 'A': 4.0, 'A-': 3.7, 
      'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7,
      'D+': 1.3, 'D': 1.0, 'F': 0.0,
      'a+': 4.3, 'a': 4.0, 'a-': 3.7,
      'b+': 3.3, 'b': 3.0, 'b-': 2.7,
      'c+': 2.3, 'c': 2.0, 'c-': 1.7,
      'd+': 1.3, 'd': 1.0, 'f': 0.0
    };

    const numericalRanges = {
      '95-100': 4.3, '90-94': 4.0, '85-89': 3.7,
      '80-84': 3.3, '75-79': 3.0, '70-74': 2.7,
      '65-69': 2.3, '60-64': 2.0, '55-59': 1.7,
      '50-54': 1.3, '45-49': 1.0, '0-44': 0.0
    };

    let studentPoints = 0;
    let requiredPoints = 0;

    const studentGradeStr = studentGrade.toString().trim();
    const requiredGradeStr = requiredGrade.toString().trim();

    // Calculate student points
    if (gradePoints[studentGradeStr] !== undefined) {
      studentPoints = gradePoints[studentGradeStr];
    } else if (numericalRanges[studentGradeStr] !== undefined) {
      studentPoints = numericalRanges[studentGradeStr];
    } else {
      const numericGrade = parseFloat(studentGradeStr);
      if (!isNaN(numericGrade)) {
        if (numericGrade >= 95) studentPoints = 4.3;
        else if (numericGrade >= 90) studentPoints = 4.0;
        else if (numericGrade >= 85) studentPoints = 3.7;
        else if (numericGrade >= 80) studentPoints = 3.3;
        else if (numericGrade >= 75) studentPoints = 3.0;
        else if (numericGrade >= 70) studentPoints = 2.7;
        else if (numericGrade >= 65) studentPoints = 2.3;
        else if (numericGrade >= 60) studentPoints = 2.0;
        else if (numericGrade >= 55) studentPoints = 1.7;
        else if (numericGrade >= 50) studentPoints = 1.3;
        else if (numericGrade >= 45) studentPoints = 1.0;
        else studentPoints = 0.0;
      }
    }

    // Calculate required points
    if (gradePoints[requiredGradeStr] !== undefined) {
      requiredPoints = gradePoints[requiredGradeStr];
    } else if (numericalRanges[requiredGradeStr] !== undefined) {
      requiredPoints = numericalRanges[requiredGradeStr];
    } else {
      const numericGrade = parseFloat(requiredGradeStr);
      if (!isNaN(numericGrade)) {
        if (numericGrade >= 95) requiredPoints = 4.3;
        else if (numericGrade >= 90) requiredPoints = 4.0;
        else if (numericGrade >= 85) requiredPoints = 3.7;
        else if (numericGrade >= 80) requiredPoints = 3.3;
        else if (numericGrade >= 75) requiredPoints = 3.0;
        else if (numericGrade >= 70) requiredPoints = 2.7;
        else if (numericGrade >= 65) requiredPoints = 2.3;
        else if (numericGrade >= 60) requiredPoints = 2.0;
        else if (numericGrade >= 55) requiredPoints = 1.7;
        else if (numericGrade >= 50) requiredPoints = 1.3;
        else if (numericGrade >= 45) requiredPoints = 1.0;
        else requiredPoints = 0.0;
      }
    }

    return studentPoints >= requiredPoints;
  };

  const handleCourseApply = (course) => {
    if (!course.canApply) {
      alert(`You are not eligible for this course.\n\nReasons:\n${course.eligibilityReason}`);
      setActiveTab('profile');
      return;
    }
    setSelectedCourseForApplication(course);
    setShowCourseApplication(true);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'courses':
        return <BrowseCourses 
          courses={eligibleCourses}
          institutions={institutions}
          onApply={handleCourseApply}
          hasAcademicResults={!!userData?.academicResults && Object.keys(userData.academicResults).length > 0}
          studentGPA={calculateGPA(userData?.academicResults)}
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
          calculatedGPA={calculateGPA(userData?.academicResults)}
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
          onApply={handleCourseApply}
          hasAcademicResults={!!userData?.academicResults && Object.keys(userData.academicResults).length > 0}
          studentGPA={calculateGPA(userData?.academicResults)}
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

      {showCourseApplication && selectedCourseForApplication && (
        <CourseApplicationForm 
          onClose={() => {
            setShowCourseApplication(false);
            setSelectedCourseForApplication(null);
          }}
          onSuccess={() => {
            setShowCourseApplication(false);
            setSelectedCourseForApplication(null);
            fetchStudentApplications();
          }}
          course={selectedCourseForApplication}
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

const BrowseCourses = ({ courses, institutions, onApply, hasAcademicResults, studentGPA }) => {
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [showOnlyEligible, setShowOnlyEligible] = useState(false);

  const filteredCourses = courses.filter(course => {
    if (selectedInstitution && course.institutionId !== selectedInstitution) return false;
    if (selectedFaculty && course.facultyName !== selectedFaculty) return false;
    if (showOnlyEligible && !course.canApply) return false;
    return true;
  });

  const faculties = [...new Set(courses.map(course => course.facultyName).filter(Boolean))];

  const eligibleCoursesCount = filteredCourses.filter(course => course.canApply).length;
  const totalCoursesCount = filteredCourses.length;

  return (
    <div className="browse-courses">
      <div className="section-header">
        <h2>Available Courses</h2>
        <div className="header-info">
          {hasAcademicResults ? (
            <div className="gpa-display">
              <p>
                <strong>Your GPA: {studentGPA}/4.3</strong> | 
                Showing courses that match your academic profile. 
                You can apply to {eligibleCoursesCount} out of {totalCoursesCount} courses.
              </p>
            </div>
          ) : (
            <div className="warning-banner">
              <span>⚠</span>
              <span>Complete your academic profile to see which courses you're eligible for and apply to them</span>
            </div>
          )}
        </div>
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

        {hasAcademicResults && (
          <div className="filter-group">
            <label>Eligibility Filter:</label>
            <select 
              value={showOnlyEligible} 
              onChange={(e) => setShowOnlyEligible(e.target.value === 'true')}
            >
              <option value="false">Show All Courses</option>
              <option value="true">Show Only Eligible Courses</option>
            </select>
          </div>
        )}
      </div>

      <div className="courses-stats">
        <div className="stat-item">
          <strong>{totalCoursesCount}</strong> courses available
        </div>
        {hasAcademicResults && (
          <>
            <div className="stat-item">
              <strong>{eligibleCoursesCount}</strong> courses you can apply for
            </div>
            <div className="stat-item gpa-stat">
              <strong>GPA: {studentGPA}/4.3</strong> your current GPA
            </div>
          </>
        )}
        <div className="stat-item">
          <strong>{institutions.length}</strong> institutions
        </div>
      </div>

      <div className="courses-grid">
        {filteredCourses.map(course => {
          const institution = institutions.find(inst => inst.id === course.institutionId);
          return (
            <div key={course.id} className={`course-card ${course.canApply ? 'eligible' : 'not-eligible'}`}>
              <div className="course-header">
                <h3>{course.name}</h3>
                <span className="course-code">{course.code}</span>
                {course.canApply && <span className="eligibility-badge">You Can Apply</span>}
                {!course.canApply && <span className="eligibility-badge not-eligible">Not Eligible</span>}
              </div>
              
              <div className="course-details">
                <p><strong>Institution:</strong> {institution?.name || 'Unknown'}</p>
                <p><strong>Faculty:</strong> {course.facultyName}</p>
                <p><strong>Duration:</strong> {course.duration} years</p>
                <p><strong>Fees:</strong> M{course.fees || 'N/A'}</p>
                <p><strong>Capacity:</strong> {course.capacity} students</p>
                {course.requiredGPA && (
                  <p><strong>Required GPA:</strong> {course.requiredGPA}/4.3</p>
                )}
              </div>
              
              <div className="course-description">
                <p>{course.description || 'No description available.'}</p>
              </div>
              
              <div className="course-eligibility">
                <h4>Eligibility Status:</h4>
                <p className={`eligibility-reason ${course.canApply ? 'eligible' : 'not-eligible'}`}>
                  {course.eligibilityReason}
                </p>
                {course.requirements && (
                  <div className="requirements-details">
                    <h5>Course Requirements:</h5>
                    {course.requirements.minimumGPA && (
                      <p><strong>Minimum GPA:</strong> {course.requirements.minimumGPA}/4.3</p>
                    )}
                    {course.requirements.requiredSubjects && course.requirements.requiredSubjects.length > 0 && (
                      <div>
                        <strong>Required Subjects:</strong>
                        <ul>
                          {course.requirements.requiredSubjects.map((subject, index) => (
                            <li key={index}>
                              {subject.subject}: {subject.minGrade}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {course.requirements.description && (
                      <p><strong>Additional Requirements:</strong> {course.requirements.description}</p>
                    )}
                  </div>
                )}
              </div>
              
              <button 
                className={`btn-primary ${!course.canApply ? 'disabled' : ''}`} 
                onClick={() => onApply(course)}
                disabled={!course.canApply}
              >
                {course.canApply ? 'Apply for this Course' : 'Not Eligible'}
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

const StudentProfile = ({ studentData, onProfileUpdate, calculatedGPA }) => {
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
        {calculatedGPA > 0 && (
          <div className="gpa-display-large">
            <h4>Calculated GPA: <span className="gpa-value">{calculatedGPA}/4.3</span></h4>
            <p>This GPA is used to determine your eligibility for courses. Scale: A+ (4.3), A (4.0), A- (3.7), B+ (3.3), etc.</p>
          </div>
        )}
        
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
              <div className="grade-format-info">
                <p><strong>Accepted formats:</strong> Letter grades (A+, A, B+, etc.), Percentage ranges (95-100, 90-94, etc.), or Numerical values (95, 87, etc.)</p>
                <p><strong>GPA Scale:</strong> A+ (4.3), A (4.0), A- (3.7), B+ (3.3), B (3.0), B- (2.7), C+ (2.3), C (2.0), C- (1.7), D+ (1.3), D (1.0), F (0.0)</p>
              </div>
              <div className="academic-results">
                <div className="results-grid">
                  <div className="form-group">
                    <label>Mathematics *</label>
                    <input
                      type="text"
                      value={academicResults.mathematics || ''}
                      onChange={(e) => handleAcademicResultsChange('mathematics', e.target.value)}
                      className="form-input"
                      placeholder="A+ / 95-100 / 95"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>English *</label>
                    <input
                      type="text"
                      value={academicResults.english || ''}
                      onChange={(e) => handleAcademicResultsChange('english', e.target.value)}
                      className="form-input"
                      placeholder="A / 90-94 / 92"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Science *</label>
                    <input
                      type="text"
                      value={academicResults.science || ''}
                      onChange={(e) => handleAcademicResultsChange('science', e.target.value)}
                      className="form-input"
                      placeholder="B+ / 85-89 / 87"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Social Studies *</label>
                    <input
                      type="text"
                      value={academicResults.socialStudies || ''}
                      onChange={(e) => handleAcademicResultsChange('socialStudies', e.target.value)}
                      className="form-input"
                      placeholder="B / 80-84 / 82"
                      required
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

// StudentDocuments and CourseApplicationForm components remain the same as previous code
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

const CourseApplicationForm = ({ onClose, onSuccess, course, institutions, studentId }) => {
  const [formData, setFormData] = useState({
    message: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    try {
      await addDoc(collection(db, 'applications'), {
        studentId: studentId,
        institutionId: course.institutionId,
        courseId: course.id,
        status: 'pending',
        appliedAt: new Date(),
        message: formData.message,
        courseName: course.name,
        institutionName: institutions.find(inst => inst.id === course.institutionId)?.name || 'Unknown'
      });
      onSuccess();
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('Error submitting application');
    } finally {
      setLoading(false);
    }
  };

  const institution = institutions.find(inst => inst.id === course.institutionId);

  return (
    <div className="modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Apply for {course.name}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="application-summary">
          <h4>Course Details:</h4>
          <p><strong>Course:</strong> {course.name} ({course.code})</p>
          <p><strong>Institution:</strong> {institution?.name || 'Unknown'}</p>
          <p><strong>Faculty:</strong> {course.facultyName}</p>
          <p><strong>Duration:</strong> {course.duration} years</p>
        </div>
        
        <form onSubmit={handleSubmit}>
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