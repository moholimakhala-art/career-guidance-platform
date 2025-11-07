import { db } from '../firebase/config';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

// Course functions
export const courseService = {
  // Get all courses
  getCourses: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'courses'));
      const courses = [];
      querySnapshot.forEach((doc) => {
        courses.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, courses };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get courses by institution
  getCoursesByInstitution: async (institutionId) => {
    try {
      const q = query(
        collection(db, 'courses'), 
        where('institutionId', '==', institutionId)
      );
      const querySnapshot = await getDocs(q);
      const courses = [];
      querySnapshot.forEach((doc) => {
        courses.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, courses };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Add a new course
  addCourse: async (courseData) => {
    try {
      const docRef = await addDoc(collection(db, 'courses'), {
        ...courseData,
        createdAt: serverTimestamp(),
        status: 'active'
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get course by ID
  getCourseById: async (courseId) => {
    try {
      const docSnap = await getDoc(doc(db, 'courses', courseId));
      if (docSnap.exists()) {
        return { success: true, course: { id: docSnap.id, ...docSnap.data() } };
      } else {
        return { success: false, error: 'Course not found' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Application functions
export const applicationService = {
  // Submit course application
  submitApplication: async (applicationData) => {
    try {
      const applicationId = `APP${Date.now()}${Math.random().toString(36).substr(2, 5)}`;
      const docRef = await addDoc(collection(db, 'applications'), {
        ...applicationData,
        appliedDate: serverTimestamp(),
        status: 'pending',
        applicationId: applicationId
      });
      return { success: true, id: docRef.id, applicationId: applicationId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get applications by student
  getStudentApplications: async (studentId) => {
    try {
      const q = query(
        collection(db, 'applications'), 
        where('studentId', '==', studentId),
        orderBy('appliedDate', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const applications = [];
      querySnapshot.forEach((doc) => {
        applications.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, applications };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get applications by institution
  getInstitutionApplications: async (institutionId) => {
    try {
      // First get courses for this institution
      const coursesQuery = query(
        collection(db, 'courses'),
        where('institutionId', '==', institutionId)
      );
      const coursesSnapshot = await getDocs(coursesQuery);
      const courseIds = coursesSnapshot.docs.map(doc => doc.id);

      if (courseIds.length === 0) {
        return { success: true, applications: [] };
      }

      // Then get applications for these courses
      const applicationsQuery = query(
        collection(db, 'applications'),
        where('courseId', 'in', courseIds),
        orderBy('appliedDate', 'desc')
      );
      
      const applicationsSnapshot = await getDocs(applicationsQuery);
      const applications = [];
      applicationsSnapshot.forEach((doc) => {
        applications.push({ id: doc.id, ...doc.data() });
      });
      
      return { success: true, applications };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Update application status (for institutions to admit/reject students)
  updateApplicationStatus: async (applicationId, status) => {
    try {
      await updateDoc(doc(db, 'applications', applicationId), {
        status: status,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get application by ID
  getApplicationById: async (applicationId) => {
    try {
      const docSnap = await getDoc(doc(db, 'applications', applicationId));
      if (docSnap.exists()) {
        return { success: true, application: { id: docSnap.id, ...docSnap.data() } };
      } else {
        return { success: false, error: 'Application not found' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Job functions
export const jobService = {
  // Post a new job
  postJob: async (jobData) => {
    try {
      const docRef = await addDoc(collection(db, 'jobPostings'), {
        ...jobData,
        postedDate: serverTimestamp(),
        status: 'active',
        applications: 0
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get all jobs
  getJobs: async () => {
    try {
      const q = query(collection(db, 'jobPostings'), orderBy('postedDate', 'desc'));
      const querySnapshot = await getDocs(q);
      const jobs = [];
      querySnapshot.forEach((doc) => {
        jobs.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, jobs };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get jobs by company
  getCompanyJobs: async (companyId) => {
    try {
      const q = query(
        collection(db, 'jobPostings'), 
        where('companyId', '==', companyId),
        orderBy('postedDate', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const jobs = [];
      querySnapshot.forEach((doc) => {
        jobs.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, jobs };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Update job applications count
  updateJobApplications: async (jobId) => {
    try {
      const jobDoc = await getDoc(doc(db, 'jobPostings', jobId));
      if (jobDoc.exists()) {
        const currentApplications = jobDoc.data().applications || 0;
        await updateDoc(doc(db, 'jobPostings', jobId), {
          applications: currentApplications + 1
        });
        return { success: true };
      } else {
        return { success: false, error: 'Job not found' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get job by ID
  getJobById: async (jobId) => {
    try {
      const docSnap = await getDoc(doc(db, 'jobPostings', jobId));
      if (docSnap.exists()) {
        return { success: true, job: { id: docSnap.id, ...docSnap.data() } };
      } else {
        return { success: false, error: 'Job not found' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Institution functions
export const institutionService = {
  // Get all institutions
  getInstitutions: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'institutions'));
      const institutions = [];
      querySnapshot.forEach((doc) => {
        institutions.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, institutions };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get institution by ID
  getInstitutionById: async (institutionId) => {
    try {
      const docSnap = await getDoc(doc(db, 'institutions', institutionId));
      if (docSnap.exists()) {
        return { success: true, institution: { id: docSnap.id, ...docSnap.data() } };
      } else {
        return { success: false, error: 'Institution not found' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Update institution profile
  updateInstitutionProfile: async (institutionId, profileData) => {
    try {
      await updateDoc(doc(db, 'institutions', institutionId), {
        ...profileData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Create institution
  createInstitution: async (institutionData) => {
    try {
      const docRef = await addDoc(collection(db, 'institutions'), {
        ...institutionData,
        createdAt: serverTimestamp(),
        status: 'pending'
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// User management functions
export const userService = {
  // Get user data
  getUserData: async (userId) => {
    try {
      const docSnap = await getDoc(doc(db, 'users', userId));
      if (docSnap.exists()) {
        return { success: true, userData: docSnap.data() };
      } else {
        return { success: false, error: 'User data not found' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Update user profile
  updateUserProfile: async (userId, profileData) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        ...profileData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get user by role (for admin purposes)
  getUsersByRole: async (role) => {
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', role)
      );
      const querySnapshot = await getDocs(q);
      const users = [];
      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, users };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get all users (for admin purposes)
  getAllUsers: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const users = [];
      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, users };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Utility function to safely convert Firestore timestamps
export const convertFirestoreTimestamp = (timestamp) => {
  if (!timestamp) return null;
  
  // If it's a Firestore Timestamp
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  
  // If it's already a Date object
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  // If it's a string or number, try to convert
  try {
    return new Date(timestamp);
  } catch (error) {
    console.error('Error converting timestamp:', error);
    return null;
  }
};

// Safe date formatting function for components
export const formatFirestoreDate = (timestamp) => {
  if (!timestamp) return 'Unknown date';
  
  try {
    // If it's a Firestore timestamp
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString();
    }
    // If it's already a Date object
    else if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString();
    }
    // If it's a string
    else if (typeof timestamp === 'string') {
      return new Date(timestamp).toLocaleDateString();
    }
    // If it's a number (timestamp)
    else if (typeof timestamp === 'number') {
      return new Date(timestamp).toLocaleDateString();
    }
    else {
      return 'Invalid date';
    }
  } catch (error) {
    console.error('Error formatting date:', error, timestamp);
    return 'Date error';
  }
};

// Admin functions for system management
export const adminService = {
  // Get system statistics
  getSystemStats: async () => {
    try {
      // Get counts for different collections
      const [usersSnapshot, coursesSnapshot, applicationsSnapshot, jobsSnapshot, institutionsSnapshot] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'courses')),
        getDocs(collection(db, 'applications')),
        getDocs(collection(db, 'jobPostings')),
        getDocs(collection(db, 'institutions'))
      ]);

      const stats = {
        totalUsers: usersSnapshot.size,
        totalCourses: coursesSnapshot.size,
        totalApplications: applicationsSnapshot.size,
        totalJobs: jobsSnapshot.size,
        totalInstitutions: institutionsSnapshot.size,
        lastUpdated: new Date()
      };

      return { success: true, stats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get pending applications count
  getPendingApplications: async () => {
    try {
      const q = query(
        collection(db, 'applications'),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(q);
      return { success: true, count: querySnapshot.size };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get pending institutions count
  getPendingInstitutions: async () => {
    try {
      const q = query(
        collection(db, 'institutions'),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(q);
      return { success: true, count: querySnapshot.size };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};