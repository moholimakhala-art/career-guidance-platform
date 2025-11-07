import { db } from '../firebase/config';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';

export const initializeFirebaseData = async () => {
  try {
    console.log('🚀 Initializing Firebase collections...');

    // Check if collections already exist
    const collectionsSnapshot = await getDocs(collection(db, 'users'));
    if (!collectionsSnapshot.empty) {
      console.log('✅ Collections already exist, skipping initialization');
      return;
    }

    // 1. Create sample institutions
    const institutions = [
      {
        id: 'nul',
        name: 'National University of Lesotho',
        location: 'Roma, Lesotho',
        type: 'Public University',
        established: 1945,
        email: 'admissions@nul.ls',
        description: 'Premier higher education institution in Lesotho',
        faculties: ['Science & Technology', 'Humanities', 'Education', 'Health Sciences'],
        createdAt: new Date()
      },
      {
        id: 'lerotholi',
        name: 'Lerotholi Polytechnic',
        location: 'Maseru, Lesotho',
        type: 'Technical College',
        established: 1905,
        email: 'info@lerotholi.ls',
        description: 'Leading technical and vocational training institution',
        faculties: ['Engineering', 'Business Studies', 'Applied Sciences'],
        createdAt: new Date()
      },
      {
        id: 'limkokwing',
        name: 'Limkokwing University of Creative Technology',
        location: 'Maseru, Lesotho',
        type: 'Private University',
        established: 2008,
        email: 'enquiry@limkokwing.ls',
        description: 'Innovative university focusing on creative technologies',
        faculties: ['Creative Technology', 'Business Management', 'Communication'],
        createdAt: new Date()
      }
    ];

    for (const institution of institutions) {
      await setDoc(doc(db, 'institutions', institution.id), institution);
    }
    console.log('✅ Institutions created');

    // 2. Create sample courses
    const courses = [
      {
        id: 'cs_nul',
        name: 'Computer Science',
        institutionId: 'nul',
        institution: 'National University of Lesotho',
        duration: '4 years',
        requirements: 'Mathematics and Physical Science with minimum C grade',
        description: 'Comprehensive program covering programming, algorithms, software engineering, and computer systems',
        availableSlots: 50,
        faculty: 'Science & Technology',
        tuitionFee: 'M25,000 per year',
        applicationDeadline: '2024-03-31',
        status: 'active',
        createdAt: new Date()
      },
      {
        id: 'business_lerotholi',
        name: 'Business Administration',
        institutionId: 'lerotholi',
        institution: 'Lerotholi Polytechnic',
        duration: '3 years',
        requirements: 'Mathematics and English with minimum D grade',
        description: 'Practical business management skills for modern organizations',
        availableSlots: 75,
        faculty: 'Business Studies',
        tuitionFee: 'M18,000 per year',
        applicationDeadline: '2024-04-15',
        status: 'active',
        createdAt: new Date()
      },
      {
        id: 'education_nul',
        name: 'Education',
        institutionId: 'nul',
        institution: 'National University of Lesotho',
        duration: '4 years',
        requirements: 'English and any 2 subjects with minimum C grade',
        description: 'Teacher training program for secondary education',
        availableSlots: 100,
        faculty: 'Education',
        tuitionFee: 'M20,000 per year',
        applicationDeadline: '2024-03-31',
        status: 'active',
        createdAt: new Date()
      },
      {
        id: 'engineering_lerotholi',
        name: 'Electrical Engineering',
        institutionId: 'lerotholi',
        institution: 'Lerotholi Polytechnic',
        duration: '3 years',
        requirements: 'Mathematics, Physical Science, and English with minimum C grade',
        description: 'Diploma in electrical engineering with practical training',
        availableSlots: 40,
        faculty: 'Engineering',
        tuitionFee: 'M22,000 per year',
        applicationDeadline: '2024-04-20',
        status: 'active',
        createdAt: new Date()
      }
    ];

    for (const course of courses) {
      await setDoc(doc(db, 'courses', course.id), course);
    }
    console.log('✅ Courses created');

    // 3. Create sample companies
    const companies = [
      {
        id: 'econet',
        name: 'Econet Telecom Lesotho',
        industry: 'Telecommunications',
        location: 'Maseru, Lesotho',
        email: 'careers@econet.ls',
        phone: '+266 2231 4567',
        description: 'Leading telecommunications provider in Lesotho',
        website: 'https://www.econet.ls',
        partnerSince: 2020,
        status: 'approved',
        createdAt: new Date()
      },
      {
        id: 'standard_bank',
        name: 'Standard Bank Lesotho',
        industry: 'Banking & Finance',
        location: 'Maseru, Lesotho',
        email: 'hr@standardbank.ls',
        phone: '+266 2231 2345',
        description: 'Premier banking and financial services institution',
        website: 'https://www.standardbank.ls',
        partnerSince: 2019,
        status: 'approved',
        createdAt: new Date()
      },
      {
        id: 'ministry_education',
        name: 'Ministry of Education and Training',
        industry: 'Government',
        location: 'Maseru, Lesotho',
        email: 'recruitment@education.gov.ls',
        phone: '+266 2232 6789',
        description: 'Government ministry responsible for education policy',
        website: 'https://www.education.gov.ls',
        partnerSince: 2018,
        status: 'approved',
        createdAt: new Date()
      }
    ];

    for (const company of companies) {
      await setDoc(doc(db, 'companies', company.id), company);
    }
    console.log('✅ Companies created');

    // 4. Create sample job postings
    const jobs = [
      {
        id: 'job1',
        companyId: 'econet',
        companyName: 'Econet Telecom Lesotho',
        title: 'Software Developer',
        department: 'IT Department',
        description: 'We are looking for a skilled Software Developer to join our IT team. You will be responsible for developing and maintaining software solutions for our telecommunications services.',
        requirements: 'Bachelor\'s degree in Computer Science, 2+ years of programming experience, knowledge of Java and Python',
        qualifications: 'BSc in Computer Science or related field, experience with mobile applications',
        salaryRange: 'M15,000 - M20,000',
        location: 'Maseru, Lesotho',
        applicationDeadline: '2024-02-28',
        status: 'active',
        applications: 0,
        postedDate: new Date(),
        type: 'Full-time'
      },
      {
        id: 'job2',
        companyId: 'standard_bank',
        companyName: 'Standard Bank Lesotho',
        title: 'Marketing Manager',
        department: 'Marketing Department',
        description: 'Seeking an experienced Marketing Manager to develop and implement marketing strategies for our banking products and services.',
        requirements: 'Bachelor\'s degree in Marketing, 3+ years marketing experience, strong communication skills',
        qualifications: 'BCom in Marketing or related field, experience in financial services marketing',
        salaryRange: 'M18,000 - M25,000',
        location: 'Maseru, Lesotho',
        applicationDeadline: '2024-03-15',
        status: 'active',
        applications: 0,
        postedDate: new Date(),
        type: 'Full-time'
      }
    ];

    for (const job of jobs) {
      await setDoc(doc(db, 'jobPostings', job.id), job);
    }
    console.log('✅ Job postings created');

    // 5. Create empty collections structure
    const emptyCollections = ['applications', 'transcripts', 'notifications', 'reports'];
    
    for (const collectionName of emptyCollections) {
      // Just create one dummy document to initialize the collection
      await setDoc(doc(db, collectionName, 'init'), {
        initialized: true,
        createdAt: new Date()
      });
    }
    console.log('✅ Empty collections initialized');

    console.log('🎉 All Firebase collections initialized successfully!');

  } catch (error) {
    console.error('❌ Error initializing Firebase data:', error);
  }
};