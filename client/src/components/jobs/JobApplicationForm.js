import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../services/firebase';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc,
  arrayUnion,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './JobApplicationForm.css';

const JobApplicationForm = ({ job, onClose, onSuccess }) => {
  const { user, userData } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    coverLetter: '',
    experience: '',
    education: '',
    skills: ''
  });
  const [resume, setResume] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [studentProfile, setStudentProfile] = useState(null);

  useEffect(() => {
    if (user && userData) {
      // Pre-fill form with user data
      setFormData(prev => ({
        ...prev,
        fullName: userData.name || '',
        email: user.email || '',
        phone: userData.phone || ''
      }));
      setStudentProfile(userData);
    }
  }, [user, userData]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        setError(`File "${file.name}" is too large. Maximum size is 5MB.`);
        e.target.value = ''; // Clear the file input
        return;
      }

      // Validate file types
      const validResumeTypes = ['.pdf', '.doc', '.docx'];
      const validTranscriptTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
      
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      
      if (fileType === 'resume' && !validResumeTypes.includes(fileExtension)) {
        setError('Invalid file type for resume. Please upload PDF, DOC, or DOCX.');
        e.target.value = '';
        return;
      }
      
      if (fileType === 'transcript' && !validTranscriptTypes.includes(fileExtension)) {
        setError('Invalid file type for transcript. Please upload PDF, DOC, DOCX, JPG, or PNG.');
        e.target.value = '';
        return;
      }

      setError(''); // Clear any previous errors
      
      if (fileType === 'resume') {
        setResume(file);
      } else if (fileType === 'transcript') {
        setTranscript(file);
      }
    }
  };

  const uploadFile = async (file, path) => {
    if (!file) return null;
    
    const fileRef = ref(storage, `${path}/${user.uid}_${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(fileRef);
    return downloadURL;
  };

  const checkExistingApplication = async () => {
    try {
      // Check if student already applied for this job
      const applicationsQuery = await getDocs(
        query(
          collection(db, 'jobApplications'),
          where('studentId', '==', user.uid),
          where('jobId', '==', job.id)
        )
      );
      return !applicationsQuery.empty;
    } catch (error) {
      console.error('Error checking existing application:', error);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.fullName.trim() || !formData.email.trim() || !formData.education.trim() || !formData.skills.trim() || !formData.coverLetter.trim()) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      if (!resume) {
        setError('Please upload your resume');
        setLoading(false);
        return;
      }

      // Check if already applied
      const alreadyApplied = await checkExistingApplication();
      if (alreadyApplied) {
        setError('You have already applied for this job position.');
        setLoading(false);
        return;
      }

      // Upload files
      let resumeUrl = null;
      let transcriptUrl = null;

      if (resume) {
        resumeUrl = await uploadFile(resume, `resumes/${user.uid}`);
      }

      if (transcript) {
        transcriptUrl = await uploadFile(transcript, `transcripts/${user.uid}`);
      }

      // Create application document
      const applicationData = {
        studentId: user.uid,
        studentName: formData.fullName,
        studentEmail: formData.email,
        studentPhone: formData.phone,
        jobId: job.id,
        jobTitle: job.title,
        companyId: job.companyId,
        companyName: job.companyName,
        coverLetter: formData.coverLetter,
        experience: formData.experience,
        education: formData.education,
        skills: formData.skills,
        resumeUrl: resumeUrl,
        transcriptUrl: transcriptUrl,
        status: 'pending',
        appliedAt: new Date(),
        qualifications: {
          gpa: studentProfile?.gpa,
          degree: studentProfile?.degree,
          institution: studentProfile?.institution,
          graduationYear: studentProfile?.graduationYear
        }
      };

      // Save application to Firestore
      const applicationRef = await addDoc(collection(db, 'jobApplications'), applicationData);

      // Update job document to increment application count
      const jobRef = doc(db, 'jobs', job.id);
      await updateDoc(jobRef, {
        applications: arrayUnion(user.uid),
        applicationCount: (job.applicationCount || 0) + 1
      });

      // Update student profile with application
      const studentRef = doc(db, 'users', user.uid);
      await updateDoc(studentRef, {
        jobApplications: arrayUnion(applicationRef.id)
      });

      console.log(' Job application submitted successfully');
      onSuccess(applicationRef.id);
      
    } catch (error) {
      console.error(' Error submitting application:', error);
      setError('Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const removeFile = (fileType) => {
    if (fileType === 'resume') {
      setResume(null);
    } else if (fileType === 'transcript') {
      setTranscript(null);
    }
  };

  return (
    <div className="job-application-modal">
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="job-application-form">
        <div className="form-header">
          <h2>Apply for {job.title}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="job-info">
          <h3>{job.title}</h3>
          <p><strong>Company:</strong> {job.companyName}</p>
          <p><strong>Location:</strong> {job.location}</p>
          <p><strong>Type:</strong> {job.type}</p>
          <p><strong>Department:</strong> {job.department}</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h4>Personal Information</h4>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your full name"
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="your.email@example.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+266 1234 5678"
              />
            </div>
          </div>

          <div className="form-section">
            <h4>Education & Experience</h4>
            <div className="form-group">
              <label>Education Background *</label>
              <textarea
                name="education"
                value={formData.education}
                onChange={handleInputChange}
                rows="3"
                placeholder="Describe your educational background, degrees, certifications..."
                required
              />
            </div>

            <div className="form-group">
              <label>Work Experience</label>
              <textarea
                name="experience"
                value={formData.experience}
                onChange={handleInputChange}
                rows="4"
                placeholder="Describe your relevant work experience, projects, internships..."
              />
            </div>

            <div className="form-group">
              <label>Skills & Qualifications *</label>
              <textarea
                name="skills"
                value={formData.skills}
                onChange={handleInputChange}
                rows="3"
                placeholder="List your technical skills, soft skills, and relevant qualifications..."
                required
              />
            </div>
          </div>

          <div className="form-section">
            <h4>Documents</h4>
            <div className="file-upload-group">
              {/* Resume Upload */}
              <div className="form-group">
                <label>Resume/CV *</label>
                <div className={`file-upload-container ${resume ? 'has-file' : ''}`}>
                  {!resume ? (
                    <label className="file-upload-label">
                      <div className="file-upload-icon"></div>
                      <div className="file-upload-text">
                        <span className="file-upload-main-text">Click to upload resume</span>
                        <span className="file-upload-hint">PDF, DOC, DOCX (Max: 5MB)</span>
                      </div>
                      <input
                        type="file"
                        className="file-upload-input"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => handleFileChange(e, 'resume')}
                        required
                      />
                    </label>
                  ) : (
                    <div className="file-selected-info">
                      <div className="file-selected-icon"></div>
                      <div className="file-selected-details">
                        <div className="file-selected-name">{resume.name}</div>
                        <div className="file-selected-size">{getFileSize(resume.size)}</div>
                      </div>
                      <button
                        type="button"
                        className="file-remove-btn"
                        onClick={() => removeFile('resume')}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Transcript Upload */}
              <div className="form-group">
                <label>Academic Transcript (Optional)</label>
                <div className={`file-upload-container ${transcript ? 'has-file' : ''}`}>
                  {!transcript ? (
                    <label className="file-upload-label">
                      <div className="file-upload-icon"></div>
                      <div className="file-upload-text">
                        <span className="file-upload-main-text">Click to upload transcript</span>
                        <span className="file-upload-hint">PDF, DOC, DOCX, JPG, PNG (Max: 5MB)</span>
                      </div>
                      <input
                        type="file"
                        className="file-upload-input"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(e, 'transcript')}
                      />
                    </label>
                  ) : (
                    <div className="file-selected-info">
                      <div className="file-selected-icon"></div>
                      <div className="file-selected-details">
                        <div className="file-selected-name">{transcript.name}</div>
                        <div className="file-selected-size">{getFileSize(transcript.size)}</div>
                      </div>
                      <button
                        type="button"
                        className="file-remove-btn"
                        onClick={() => removeFile('transcript')}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>Cover Letter</h4>
            <div className="form-group">
              <label>Why are you interested in this position? *</label>
              <textarea
                name="coverLetter"
                value={formData.coverLetter}
                onChange={handleInputChange}
                rows="5"
                placeholder="Explain why you're a good fit for this position, your motivation, and what you can bring to the company..."
                required
              />
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Submitting Application...' : 'Submit Application'}
            </button>
            <button 
              type="button" 
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
          </div>

          <div className="form-footer">
            <p>
              <small>
                By submitting this application, you agree to share your information with {job.companyName} 
                for recruitment purposes. Your data will be handled according to our Privacy Policy.
              </small>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobApplicationForm;