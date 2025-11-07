const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (replace with Firebase later)
let applications = [];
let jobPostings = [];
let courses = [
  { 
    id: 1, 
    name: 'Computer Science', 
    institution: 'National University of Lesotho',
    duration: '4 years',
    requirements: 'Mathematics and Physical Science',
    availableSlots: 50,
    description: 'Learn programming, algorithms, and software development'
  },
  { 
    id: 2, 
    name: 'Business Administration', 
    institution: 'Lerotholi Polytechnic',
    duration: '3 years',
    requirements: 'Mathematics and English',
    availableSlots: 75,
    description: 'Business management and administration skills'
  }
];

// Authentication endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password, role } = req.body;
  
  // Mock authentication
  if (email && password) {
    const users = {
      student: { id: 1, email, role: 'student', name: 'John Student' },
      admin: { id: 2, email, role: 'admin', name: 'Admin User' },
      institution: { id: 3, email, role: 'institution', name: 'NUL Admin' },
      company: { id: 4, email, role: 'company', name: 'Econet HR' }
    };
    
    const user = users[role];
    if (user) {
      res.json({
        success: true,
        user,
        token: 'mock-jwt-token'
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
  } else {
    res.status(400).json({
      success: false,
      error: 'Email and password required'
    });
  }
});

// Course application endpoint
app.post('/api/applications', (req, res) => {
  const { studentId, courseId, studentName, email, qualifications } = req.body;
  
  const application = {
    id: applications.length + 1,
    studentId,
    courseId,
    studentName,
    email,
    qualifications,
    status: 'pending',
    appliedDate: new Date().toISOString(),
    applicationId: `APP${Date.now()}`
  };
  
  applications.push(application);
  
  res.json({
    success: true,
    application,
    message: 'Application submitted successfully!'
  });
});

// Get applications by student
app.get('/api/applications/student/:studentId', (req, res) => {
  const studentId = parseInt(req.params.studentId);
  const studentApplications = applications.filter(app => app.studentId === studentId);
  
  res.json({
    success: true,
    applications: studentApplications
  });
});

// Job posting endpoints
app.post('/api/jobs', (req, res) => {
  const { companyId, title, department, description, requirements, qualifications } = req.body;
  
  const job = {
    id: jobPostings.length + 1,
    companyId,
    title,
    department,
    description,
    requirements,
    qualifications,
    status: 'active',
    postedDate: new Date().toISOString(),
    applications: 0
  };
  
  jobPostings.push(job);
  
  res.json({
    success: true,
    job,
    message: 'Job posted successfully!'
  });
});

app.get('/api/jobs', (req, res) => {
  res.json({
    success: true,
    jobs: jobPostings
  });
});

// Existing endpoints
app.get('/', (req, res) => {
  res.json({ 
    message: 'Career Guidance Backend is running!',
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/api/courses', (req, res) => {
  res.json({
    success: true,
    courses: courses
  });
});

app.get('/api/institutions', (req, res) => {
  res.json({
    success: true,
    institutions: [
      {
        id: 1,
        name: 'National University of Lesotho',
        location: 'Roma, Lesotho',
        type: 'Public University',
        established: 1945
      },
      {
        id: 2,
        name: 'Lerotholi Polytechnic',
        location: 'Maseru, Lesotho',
        type: 'Technical College',
        established: 1905
      }
    ]
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔐 Authentication: POST /api/auth/login`);
  console.log(`📝 Applications: POST /api/applications`);
  console.log(`💼 Jobs: POST /api/jobs, GET /api/jobs`);
});