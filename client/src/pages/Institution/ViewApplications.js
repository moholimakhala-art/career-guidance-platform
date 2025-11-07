import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../../services/firebase';

const ViewApplications = ({ institutionId }) => {
  const [applications, setApplications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [institutionId]);

  const fetchApplications = async () => {
    try {
      let q;
      if (filter === 'all') {
        q = query(collection(db, 'applications'), where('institutionId', '==', institutionId));
      } else {
        q = query(
          collection(db, 'applications'), 
          where('institutionId', '==', institutionId),
          where('status', '==', filter)
        );
      }

      const querySnapshot = await getDocs(q);
      const applicationsList = await Promise.all(
        querySnapshot.docs.map(async (docSnap) => {
          const appData = docSnap.data();
          
          // Fetch student details
          const studentDoc = await getDoc(doc(db, 'users', appData.studentId));
          const studentData = studentDoc.exists() ? studentDoc.data() : {};
          
          // Fetch course details
          const courseDoc = await getDoc(doc(db, 'courses', appData.courseId));
          const courseData = courseDoc.exists() ? courseDoc.data() : {};

          return {
            id: docSnap.id,
            ...appData,
            student: studentData,
            course: courseData
          };
        })
      );
      
      setApplications(applicationsList);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [filter]);

  const updateApplicationStatus = async (applicationId, status) => {
    try {
      await updateDoc(doc(db, 'applications', applicationId), {
        status: status,
        reviewedAt: new Date()
      });
      
      alert(`Application ${status} successfully!`);
      fetchApplications();
    } catch (error) {
      console.error('Error updating application:', error);
      alert('Error updating application');
    }
  };

  const viewApplicationDetails = (application) => {
    setSelectedApplication(application);
    setShowDetails(true);
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'status-pending',
      admitted: 'status-admitted',
      rejected: 'status-rejected'
    };
    
    return <span className={`status-badge ${statusClasses[status]}`}>{status}</span>;
  };

  return (
    <div className="view-applications">
      <div className="section-header">
        <h2>Student Applications</h2>
        
        <div className="filters">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Applications</option>
            <option value="pending">Pending</option>
            <option value="admitted">Admitted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="applications-table">
        <table>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Course</th>
              <th>Applied Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.map(application => (
              <tr key={application.id}>
                <td>
                  {application.student?.firstName} {application.student?.lastName}
                </td>
                <td>{application.course?.name}</td>
                <td>{application.appliedAt?.toDate().toLocaleDateString()}</td>
                <td>{getStatusBadge(application.status)}</td>
                <td className="actions">
                  <button 
                    onClick={() => viewApplicationDetails(application)}
                    className="btn-view"
                  >
                    View Details
                  </button>
                  
                  {application.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => updateApplicationStatus(application.id, 'admitted')}
                        className="btn-success"
                      >
                        Admit
                      </button>
                      <button 
                        onClick={() => updateApplicationStatus(application.id, 'rejected')}
                        className="btn-danger"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {applications.length === 0 && (
          <div className="empty-state">
            <p>No applications found for the selected filter.</p>
          </div>
        )}
      </div>

      {/* Application Details Modal */}
      {showDetails && selectedApplication && (
        <div className="modal">
          <div className="modal-content large">
            <div className="modal-header">
              <h3>Application Details</h3>
              <button 
                onClick={() => setShowDetails(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="details-grid">
                <div className="detail-section">
                  <h4>Student Information</h4>
                  <div className="detail-item">
                    <strong>Name:</strong> {selectedApplication.student?.firstName} {selectedApplication.student?.lastName}
                  </div>
                  <div className="detail-item">
                    <strong>Email:</strong> {selectedApplication.student?.email}
                  </div>
                  <div className="detail-item">
                    <strong>Phone:</strong> {selectedApplication.student?.phone}
                  </div>
                </div>
                
                <div className="detail-section">
                  <h4>Course Information</h4>
                  <div className="detail-item">
                    <strong>Course:</strong> {selectedApplication.course?.name}
                  </div>
                  <div className="detail-item">
                    <strong>Code:</strong> {selectedApplication.course?.code}
                  </div>
                  <div className="detail-item">
                    <strong>Faculty:</strong> {selectedApplication.course?.facultyName}
                  </div>
                  <div className="detail-item">
                    <strong>Duration:</strong> {selectedApplication.course?.duration} years
                  </div>
                </div>
                
                <div className="detail-section">
                  <h4>Application Details</h4>
                  <div className="detail-item">
                    <strong>Applied Date:</strong> {selectedApplication.appliedAt?.toDate().toLocaleDateString()}
                  </div>
                  <div className="detail-item">
                    <strong>Status:</strong> {getStatusBadge(selectedApplication.status)}
                  </div>
                  {selectedApplication.reviewedAt && (
                    <div className="detail-item">
                      <strong>Reviewed Date:</strong> {selectedApplication.reviewedAt?.toDate().toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
              
              {selectedApplication.documents && selectedApplication.documents.length > 0 && (
                <div className="detail-section">
                  <h4>Attached Documents</h4>
                  <div className="documents-list">
                    {selectedApplication.documents.map((doc, index) => (
                      <div key={index} className="document-item">
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                          {doc.name}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              {selectedApplication.status === 'pending' && (
                <div className="action-buttons">
                  <button 
                    onClick={() => {
                      updateApplicationStatus(selectedApplication.id, 'admitted');
                      setShowDetails(false);
                    }}
                    className="btn-success"
                  >
                    Admit Student
                  </button>
                  <button 
                    onClick={() => {
                      updateApplicationStatus(selectedApplication.id, 'rejected');
                      setShowDetails(false);
                    }}
                    className="btn-danger"
                  >
                    Reject Application
                  </button>
                </div>
              )}
              <button 
                onClick={() => setShowDetails(false)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewApplications;