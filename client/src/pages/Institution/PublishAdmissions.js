import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc,
  writeBatch,
  getDoc  // Add this import
} from 'firebase/firestore';
import { db } from '../../services/firebase';

const PublishAdmissions = ({ institutionId }) => {
  const [admittedStudents, setAdmittedStudents] = useState([]);
  const [waitingList, setWaitingList] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [admissionStats, setAdmissionStats] = useState({});

  useEffect(() => {
    fetchCourses();
  }, [institutionId]);

  useEffect(() => {
    if (selectedCourse) {
      fetchAdmittedStudents();
      fetchWaitingList();
      calculateAdmissionStats();
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      const q = query(
        collection(db, 'courses'), 
        where('institutionId', '==', institutionId)
      );
      const querySnapshot = await getDocs(q);
      const coursesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCourses(coursesList);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchAdmittedStudents = async () => {
    try {
      const q = query(
        collection(db, 'applications'), 
        where('institutionId', '==', institutionId),
        where('courseId', '==', selectedCourse),
        where('status', '==', 'admitted')
      );
      
      const querySnapshot = await getDocs(q);
      const studentsList = await Promise.all(
        querySnapshot.docs.map(async (docSnap) => {
          const appData = docSnap.data();
          const studentDoc = await getDoc(doc(db, 'users', appData.studentId));
          const studentData = studentDoc.exists() ? studentDoc.data() : {};
          
          return {
            id: docSnap.id,
            ...appData,
            student: studentData
          };
        })
      );
      
      setAdmittedStudents(studentsList);
    } catch (error) {
      console.error('Error fetching admitted students:', error);
    }
  };

  const fetchWaitingList = async () => {
    try {
      const q = query(
        collection(db, 'applications'), 
        where('institutionId', '==', institutionId),
        where('courseId', '==', selectedCourse),
        where('status', '==', 'pending')
      );
      
      const querySnapshot = await getDocs(q);
      const waitingListData = await Promise.all(
        querySnapshot.docs.map(async (docSnap) => {
          const appData = docSnap.data();
          const studentDoc = await getDoc(doc(db, 'users', appData.studentId));
          const studentData = studentDoc.exists() ? studentDoc.data() : {};
          
          return {
            id: docSnap.id,
            ...appData,
            student: studentData,
            appliedAt: appData.appliedAt
          };
        })
      );
      
      // Sort by application date (earliest first)
      waitingListData.sort((a, b) => a.appliedAt - b.appliedAt);
      setWaitingList(waitingListData);
    } catch (error) {
      console.error('Error fetching waiting list:', error);
    }
  };

  const calculateAdmissionStats = async () => {
    if (!selectedCourse) return;

    try {
      const courseDoc = await getDoc(doc(db, 'courses', selectedCourse));
      const courseData = courseDoc.data();
      
      const totalAdmitted = admittedStudents.length;
      const capacity = courseData.capacity || 0;
      const availableSpots = Math.max(0, capacity - totalAdmitted);
      
      setAdmissionStats({
        totalAdmitted,
        capacity,
        availableSpots,
        waitingListCount: waitingList.length
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  const publishAdmissions = async () => {
    if (!window.confirm('Are you sure you want to publish admissions? This will notify all admitted students.')) {
      return;
    }

    setIsPublishing(true);
    try {
      // Here you would typically:
      // 1. Send notifications to admitted students
      // 2. Update admission status to "published"
      // 3. Any other post-publication actions
      
      alert('Admissions published successfully! Admitted students have been notified.');
    } catch (error) {
      console.error('Error publishing admissions:', error);
      alert('Error publishing admissions');
    } finally {
      setIsPublishing(false);
    }
  };

  const promoteFromWaitingList = async () => {
    if (admissionStats.availableSpots <= 0) {
      alert('No available spots to promote from waiting list.');
      return;
    }

    if (waitingList.length === 0) {
      alert('No students in waiting list.');
      return;
    }

    try {
      const batch = writeBatch(db);
      const studentsToPromote = waitingList.slice(0, admissionStats.availableSpots);

      for (const student of studentsToPromote) {
        const appRef = doc(db, 'applications', student.id);
        batch.update(appRef, {
          status: 'admitted',
          promotedFromWaitingList: true,
          promotedAt: new Date()
        });
      }

      await batch.commit();
      alert(`${studentsToPromote.length} student(s) promoted from waiting list!`);
      fetchAdmittedStudents();
      fetchWaitingList();
    } catch (error) {
      console.error('Error promoting from waiting list:', error);
      alert('Error promoting students');
    }
  };

  return (
    <div className="publish-admissions">
      <div className="section-header">
        <h2>Publish Admissions</h2>
        <button 
          onClick={publishAdmissions}
          className="btn-primary"
          disabled={isPublishing || admittedStudents.length === 0}
        >
          {isPublishing ? 'Publishing...' : 'Publish Admissions'}
        </button>
      </div>

      <div className="admission-controls">
        <div className="form-group">
          <label>Select Course</label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="course-select"
          >
            <option value="">Choose a course</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>
                {course.name} ({course.code})
              </option>
            ))}
          </select>
        </div>

        {selectedCourse && (
          <div className="admission-stats">
            <h3>Admission Statistics</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <h4>Course Capacity</h4>
                <p className="stat-number">{admissionStats.capacity || 0}</p>
              </div>
              <div className="stat-card">
                <h4>Admitted Students</h4>
                <p className="stat-number">{admissionStats.totalAdmitted || 0}</p>
              </div>
              <div className="stat-card">
                <h4>Available Spots</h4>
                <p className="stat-number">{admissionStats.availableSpots || 0}</p>
              </div>
              <div className="stat-card">
                <h4>Waiting List</h4>
                <p className="stat-number">{admissionStats.waitingListCount || 0}</p>
              </div>
            </div>

            {admissionStats.availableSpots > 0 && waitingList.length > 0 && (
              <div className="waiting-list-actions">
                <button 
                  onClick={promoteFromWaitingList}
                  className="btn-success"
                >
                  Promote from Waiting List ({Math.min(admissionStats.availableSpots, waitingList.length)} students)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedCourse && (
        <div className="admission-lists">
          <div className="list-section">
            <h3>Admitted Students ({admittedStudents.length})</h3>
            <div className="students-list">
              {admittedStudents.map(student => (
                <div key={student.id} className="student-card">
                  <div className="student-info">
                    <strong>{student.student?.firstName} {student.student?.lastName}</strong>
                    <span>{student.student?.email}</span>
                  </div>
                  <div className="admission-date">
                    Admitted: {student.reviewedAt?.toDate().toLocaleDateString()}
                  </div>
                </div>
              ))}
              {admittedStudents.length === 0 && (
                <div className="empty-state">
                  <p>No students admitted for this course yet.</p>
                </div>
              )}
            </div>
          </div>

          <div className="list-section">
            <h3>Waiting List ({waitingList.length})</h3>
            <div className="students-list">
              {waitingList.map((student, index) => (
                <div key={student.id} className="student-card waiting">
                  <div className="student-info">
                    <strong>#{index + 1}. {student.student?.firstName} {student.student?.lastName}</strong>
                    <span>{student.student?.email}</span>
                  </div>
                  <div className="application-date">
                    Applied: {student.appliedAt?.toDate().toLocaleDateString()}
                  </div>
                </div>
              ))}
              {waitingList.length === 0 && (
                <div className="empty-state">
                  <p>No students in waiting list.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublishAdmissions;